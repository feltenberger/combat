# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is This

Web-based multiplayer remake of Atari Combat. Two tanks battle in arenas with destructible rocks and indestructible walls. Real-time multiplayer via Firebase.

## Commands

```bash
npm run dev        # Local dev server (Vite)
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
npm test           # Run all tests (vitest run)
npm run test:watch # Watch mode (vitest)
npx vitest run src/renderer/TankRenderer.test.ts  # Single test file
```

Validate changes with `npm run build` (runs `tsc -b && vite build`) and `npm test`.

## Deployment

Two Firebase projects exist. **Default is staging. Never deploy to production unless explicitly instructed.**

| Alias       | Project ID          | URL                              |
|-------------|---------------------|----------------------------------|
| staging     | combat-staging      | https://combat-staging.web.app   |
| production  | combat-retro-game   | https://combat-retro-game.web.app|

```bash
npm run build && firebase deploy --only hosting              # staging (default)
npm run build && firebase deploy --only hosting -P production # production (explicit only)
firebase deploy --only database,firestore                    # deploy security rules
```

## Environment Variables

Copy `.env.example` to `.env`. All prefixed `VITE_FIREBASE_`: `API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, `DATABASE_URL`. Files `.env` and `.env.*` are gitignored.

## Architecture

### Tech Stack

React 19 + TypeScript with Vite. Canvas 2D API for all rendering (960x640, programmatic sprites — no external art assets). Firebase RTDB for real-time sync, Firestore for persistent match history, Anonymous Auth for stable UIDs.

### Key Directories

- `src/engine/` — Game simulation: `GameEngine` orchestrates `Tank`, `Bullet`, `Arena`, `Collision`, `ParticleSystem`, `InputManager`
- `src/renderer/` — Canvas rendering: `Renderer` delegates to `TankRenderer`, `BulletRenderer`, `ArenaRenderer`, `ParticleRenderer`, `HUDRenderer`
- `src/firebase/` — Firebase services: `presence`, `lobby`, `gameSync`, `matchHistory`
- `src/hooks/` — React hooks: `useGameLoop`, `useFirebasePresence`, `useKeyboardInput`
- `src/config/constants.ts` — All physics values, tile sizes, colors, timing constants
- `src/components/lobby/` — Name entry, player list, challenges, color picker, fire rate slider
- `src/components/game/` — Game page, canvas, touch controls
- `src/components/scoreboard/` — Match history display
- `src/utils/math.ts` — `lerp()` and `lerpAngle()` used for guest interpolation
- `src/types/` — TypeScript interfaces for game state, Firebase data, arena definitions

### Routes

- `/` — Lobby (name entry, player list, challenge flow)
- `/game/:gameId` — Active game
- `/scoreboard` — Match history

### Tank Colors

`TankColor` type (`'blue' | 'red' | 'green' | 'camo'`) and `TANK_COLORS` map defined in `src/config/constants.ts`. Each entry has `main` (body) and `dark` (tracks/turret) hex values.

Color flows through: localStorage → `PresenceData.color` (RTDB) → `ChallengeData.fromColor` → `GameRoom.config.hostColor`/`guestColor` → `Renderer` → `TankRenderer`/`HUDRenderer`.

When the guest accepts a challenge and both players have the same color, `IncomingChallenge` shows a picker with the clashing color disabled so the guest must pick a different one. `IncomingChallenge` also displays the arena, rounds to win, and fire rate preset.

All lobby settings (arena, color, fire rate, rounds to win) persist in localStorage (`combat-arena`, `combat-color`, `combat-fire-rate`, `combat-rounds-to-win`).

### Networking: Host-Authoritative

The **challenger** is the host and runs the game simulation. Host reads local + remote input, runs physics at 60 Hz, broadcasts state to RTDB at 20 Hz. Guest writes input to RTDB, reads state snapshots, interpolates for smooth rendering.

- Both players write input to `/games/{gameId}/input/{uid}`
- `onDisconnect` handlers manage presence and game abandonment
- Guest interpolation uses a 100ms buffer (`INTERPOLATION_BUFFER_MS` in constants)

### Arenas

4 arenas defined programmatically in `Arena.ts` as 30x20 tile grids (no external map files). Tile types: FLOOR (0), WALL (1, indestructible), ROCK (2, destructible 3 HP), SPAWN_1 (3), SPAWN_2 (4). Arena index is selected during the challenge flow and stored in game config.

### Physics

- Fixed 60 Hz timestep with accumulator pattern (`PHYSICS_STEP` = 1/60)
- Canvas is fixed at 960x640 (30 cols x 20 rows, 32px tiles)
- Tank rotation movement (not strafing) — left/right rotate, up/down move in facing direction
- Bullet cooldown and max bullets per player are configurable via `FIRE_RATE_PRESETS` in constants (Rapid/Fast/Normal/Classic). Default is Classic (1 bullet, 0.5s cooldown). Fire rate flows: lobby slider → `ChallengeData.fireRate` → `GameRoom.config.fireRate` → `GameEngine` constructor. 3s lifetime, bullets die on wall/rock contact
- Rocks have 3 HP with visual damage states, become passable rubble at 0
- Circle-circle collision for bullet-tank hits, multi-point circle check for tank-wall sliding

### State Machine

```
WAITING -> COUNTDOWN (3s) -> PLAYING -> ROUND_OVER (2s) -> COUNTDOWN -> ... -> MATCH_OVER
```

Rounds to win is configurable via `ROUNDS_TO_WIN_OPTIONS` (1, 2, 3, 5), default 2. Host writes match result to Firestore on completion.

### Firebase Data Model

**RTDB** (real-time):
- `/presence/{uid}` — online status with `onDisconnect`
- `/challenges/{targetUid}` — pending challenges
- `/games/{gameId}/config` — game room config (write-once)
- `/games/{gameId}/state` — authoritative state (host writes)
- `/games/{gameId}/input/{uid}` — player input
- `/games/{gameId}/presence/{uid}` — in-game presence

**Firestore** (persistent):
- `matches` collection — completed match records
- `players` collection — per-player win/loss stats

### Rendering Pipeline

Render order: arena → bullets → tanks → particles → HUD → overlays. This matters when adding visual features that need to layer correctly.

## Testing

- Vitest with `happy-dom` environment, globals enabled (no manual `describe`/`it`/`expect` imports needed)
- Setup file at `src/test/setup.ts` (imports `@testing-library/jest-dom`)
- Component tests use `@testing-library/react` + `@testing-library/user-event`
- Canvas rendering tests mock `CanvasRenderingContext2D` with `vi.fn()` stubs
- Firebase modules mocked in component tests via `vi.mock()`
- Test files colocated with source (e.g., `TankRenderer.test.ts` next to `TankRenderer.ts`)

## Firebase Gotchas

1. **RTDB read rules don't cascade upward.** Listening on `/presence` requires `.read` at or above that path, not just on `/presence/$uid`.

2. **RTDB write rules don't cascade either.** Writing an object at `/games/{gameId}` fails if `.write` rules only exist on child paths. Split into separate `set()` calls at child paths.

3. **RTDB strips empty arrays.** `bullets: []` becomes `undefined` after serialization. Always guard with `Array.isArray(x) ? x : []`.

4. **Anonymous Auth must be enabled manually** in Firebase Console > Authentication > Sign-in method. No CLI command for it.

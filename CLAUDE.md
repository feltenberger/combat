# Combat

Web-based multiplayer remake of Atari Combat. Two tanks battle in arenas with destructible rocks and indestructible walls. Real-time multiplayer via Firebase.

## Tech Stack

- **React 19 + TypeScript** with Vite
- **Canvas 2D API** for all game rendering (960x640, programmatic sprites)
- **Firebase Realtime Database** for lobby presence, challenge flow, and real-time game state sync
- **Firebase Firestore** for persistent match history and scoreboard
- **Firebase Anonymous Auth** for stable UIDs without account friction
- **Firebase Hosting** for deployment

## Project Structure

```
src/
  config/          Firebase SDK init, game constants (tile size, physics, colors)
  types/           TypeScript interfaces (game.ts, firebase.ts, arena.ts)
  engine/          Game simulation (GameEngine, Tank, Bullet, Arena, Collision, ParticleSystem, InputManager)
  renderer/        Canvas rendering (Renderer, TankRenderer, BulletRenderer, ArenaRenderer, ParticleRenderer, HUDRenderer)
  firebase/        Firebase services (presence, lobby, gameSync, matchHistory)
  components/
    lobby/         NameEntry, LobbyPage, PlayerList, ChallengeModal, IncomingChallenge
    game/          GamePage, GameCanvas, TouchControls
    scoreboard/    ScoreboardPage, MatchList, MatchRow
  hooks/           useGameLoop, useFirebasePresence, useKeyboardInput
  utils/           Math helpers (lerp, lerpAngle)
```

## Commands

```bash
npm run dev        # Local dev server
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

## Deployment

Two Firebase projects exist:

| Alias       | Project ID          | URL                              |
|-------------|---------------------|----------------------------------|
| staging     | combat-staging      | https://combat-staging.web.app   |
| production  | combat-retro-game   | https://combat-retro-game.web.app|

**Default is staging.** Never deploy to production unless explicitly instructed.

```bash
# Deploy to staging (default)
npm run build && firebase deploy --only hosting

# Deploy rules (RTDB + Firestore) to staging
firebase deploy --only database,firestore

# Deploy everything to staging
npm run build && firebase deploy

# Deploy to production (only when explicitly told)
npm run build && firebase deploy --only hosting -P production
```

## Environment Variables

Copy `.env.example` to `.env` and fill in Firebase config values. The `.env` file points at whichever Firebase project you want to run locally against (currently staging).

Required variables (all prefixed `VITE_FIREBASE_`):
`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, `DATABASE_URL`

`.env` and `.env.*` are gitignored. `.env.example` is committed.

## Architecture & Design Decisions

### Networking Model: Host-Authoritative

- The **challenger** (player who sent the challenge) is the host and runs the game simulation
- Host reads local input + remote guest input, runs physics at 60 Hz, broadcasts state to RTDB at 20 Hz
- Guest writes input to RTDB, reads state snapshots, and interpolates between them for smooth rendering
- Both players write their input to `/games/{gameId}/input/{uid}`
- `onDisconnect` handlers manage presence and game abandonment

### Why This Model

- Avoids desync issues inherent in peer-to-peer lockstep
- Guest latency (~50-150ms) is acceptable for slow-moving tanks
- Single source of truth for collision detection and scoring

### Physics

- Fixed 60 Hz timestep with accumulator pattern for deterministic behavior
- Tank rotation (not strafing) - left/right rotate, up/down move in facing direction
- 1 bullet per player at a time, 0.5s cooldown, 3s lifetime
- Bullets bounce off walls (reflected angle) and destroy rocks
- Destructible rocks have 3 HP (visual damage states) then become passable rubble
- Circle-circle collision for bullet-tank hits
- Multi-point circle check for tank-wall sliding

### Firebase Data Model

**RTDB** (real-time, low latency):
- `/presence/{uid}` - online status with `onDisconnect` cleanup
- `/challenges/{targetUid}` - pending challenge data
- `/games/{gameId}/config` - game room config (host/guest UIDs, names, arena)
- `/games/{gameId}/state` - authoritative game state (host writes, guest reads)
- `/games/{gameId}/input/{uid}` - player input (each player writes their own)
- `/games/{gameId}/presence/{uid}` - in-game presence

**Firestore** (persistent, queryable):
- `matches` collection - completed match records
- `players` collection - per-player win/loss stats

### Firebase Gotchas (Learned the Hard Way)

1. **RTDB read rules don't cascade upward.** If you listen on `/presence` but only have `.read` on `/presence/$uid`, the read is rejected. The `.read` rule must be at or above the path you attach the listener to.

2. **RTDB write rules also don't cascade.** Writing an entire object at `/games/{gameId}` fails if `.write` rules only exist on child paths like `/games/{gameId}/config`. Split writes into separate `set()` calls at the child paths that have write permission.

3. **RTDB strips empty arrays.** `bullets: []` becomes `undefined` after serialization. Always guard with `Array.isArray(x) ? x : []` when reading state.

4. **Anonymous Auth must be enabled manually** in the Firebase Console under Authentication > Sign-in method. There's no CLI command for it.

### Rendering

All graphics are programmatic Canvas 2D primitives (no sprite sheets needed):
- Tanks: body rectangle + turret barrel, colored per player (blue/red)
- Bullets: small glowing circles with trail effect
- Walls: solid gray tiles with border
- Rocks: brown tiles with 3 damage visual states + rubble
- Particles: explosions (orange/red), smoke, sparks, debris
- HUD: score panel, round indicator, player names, countdown overlay

### State Machine

```
WAITING -> COUNTDOWN (3s) -> PLAYING -> ROUND_OVER (2s delay) -> COUNTDOWN -> ... -> MATCH_OVER
```

First player to win 2 rounds wins the match. On match completion, the host writes the result to Firestore.

## Controls

### Desktop
- **Arrow keys** or **WASD**: Left/Right rotate tank, Up/Down move forward/backward
- **Space**: Fire
- **ESC**: Leave game (works at any time)

### Mobile/Tablet (Touch)
- **Virtual joystick** (left side): Drag to move/rotate
- **Fire button** (right side): Tap to shoot
- **Leave Game button** (top-right): Return to lobby

Touch controls appear automatically on touch-capable devices. Multi-touch is supported (move + fire simultaneously). The viewport is locked to prevent pinch-zoom from interfering.

## Game Flow

1. Player enters their name (stored in localStorage)
2. Lobby shows online players with presence dots
3. Player challenges another player -> modal appears on target's screen
4. On accept, both navigate to `/game/{gameId}`
5. Host runs simulation, guest interpolates received state
6. Hit = round over, first to 2 rounds = match over
7. Match result saved to Firestore, visible on scoreboard page (`/scoreboard`)

## Arenas

Four arenas selectable from the lobby (30x20 tile grid, 32px tiles):

0. **Open Field** - minimal cover, mostly open
1. **Simple Maze** - basic corridors and rooms
2. **Complex Maze** - tighter passages, more destructible rocks
3. **Fortress** - symmetric fortified positions

## Security Rules

- RTDB: Players can only write their own presence and input. Game config is write-once. State is writable by any authenticated user (host writes it).
- Firestore: Match records are publicly readable, writable only by authenticated users. Player stats are publicly readable, writable by authenticated users.
- Anonymous auth provides stable UIDs for rule enforcement without signup friction.

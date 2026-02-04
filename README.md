# Combat

A web-based multiplayer remake of the classic Atari 2600 Combat. Two players battle head-to-head with tanks across four arenas featuring destructible terrain, all running in the browser with real-time Firebase networking.

**Play now:** [combat-staging.web.app](https://combat-staging.web.app)

## Features

- **Real-time multiplayer** - challenge any online player from the lobby
- **4 arenas** - Open Field, Simple Maze, Complex Maze, Fortress
- **Destructible rocks** - blast through cover (3 hits to destroy)
- **Bullet ricochet** - shots bounce off walls
- **Round-based matches** - first to 2 rounds wins
- **Match history** - rolling scoreboard of completed games
- **Mobile support** - virtual joystick and fire button on touch devices
- **No signup required** - anonymous auth, just pick a name and play

## Controls

### Desktop

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Rotate and move tank |
| Space | Fire |
| ESC | Leave game |

### Mobile / Tablet

- **Left joystick** - drag to move and rotate
- **FIRE button** - tap to shoot

## How to Play

1. Enter your name
2. Pick an arena from the lobby
3. Challenge another online player
4. They accept, and the match begins
5. Destroy your opponent's tank to win a round
6. First to 2 rounds wins the match

## Tech Stack

- React 19 + TypeScript (Vite)
- Canvas 2D API for rendering
- Firebase Realtime Database for game sync
- Firebase Firestore for match history
- Firebase Anonymous Auth
- Firebase Hosting

## Local Development

```bash
# Install dependencies
npm install

# Copy environment config and fill in your Firebase credentials
cp .env.example .env

# Start dev server
npm run dev

# Production build
npm run build
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Anonymous Authentication** under Authentication > Sign-in method
3. Create a **Realtime Database** and a **Firestore Database**
4. Register a web app and copy the SDK config values into `.env`
5. Deploy security rules:

```bash
firebase deploy --only database,firestore
```

### Environment Variables

See `.env.example` for the required Firebase config values. All are prefixed with `VITE_FIREBASE_`.

## Deployment

```bash
npm run build
firebase deploy --only hosting
```

## Architecture

The game uses a **host-authoritative networking model**. The player who sends the challenge runs the game simulation at 60 Hz and broadcasts state via Firebase RTDB at 20 Hz. The opponent sends input and interpolates between received state snapshots for smooth rendering.

All graphics are programmatic Canvas 2D primitives -- no external art assets required.

See [CLAUDE.md](CLAUDE.md) for detailed architecture notes and design decisions.

## License

MIT

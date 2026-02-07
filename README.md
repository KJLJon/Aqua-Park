# Aqua Park - Water Slide Racing PWA

An installable single-player Progressive Web App game inspired by Aqua Park .io. Race down water slides against AI bots, avoid obstacles, collect powerups, and compete for the best time.

## Features

- **Multiple Game Modes**: Classic Race, Time Trial, Chaos, and Custom
- **AI Bots**: 5 distinct behavior profiles (Casual, Aggressive, Speedster, Trickster, Adaptive)
- **Touch Controls**: On-screen buttons, swipe gestures, optional tilt steering
- **Replay System**: Record, save, and share replays via URL
- **PWA**: Installable, works offline after first load
- **Deterministic Physics**: Fixed timestep for reliable replays
- **Customizable**: Graphics quality, audio settings, bot count, match length

## Tech Stack

- **Language**: TypeScript
- **Game Engine**: Phaser 3
- **Build Tool**: Vite
- **Audio**: Web Audio API (oscillator-based placeholder SFX)
- **Storage**: localStorage (async API for future migration)
- **Testing**: Jest (unit) + Playwright (E2E)
- **CI/CD**: GitHub Actions -> GitHub Pages

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Output in `dist/`.

### Preview Production Build

```bash
npm run preview
```

## Testing

### Unit Tests

```bash
npm test
```

Runs Jest tests for physics engine, AI logic, storage, and replay serialization.

### E2E Tests

```bash
npx playwright install
npm run e2e
```

Runs Playwright tests emulating iPhone 13 Pro and Pixel 9.

### Type Checking

```bash
npm run lint
```

## Deployment

The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:
1. Runs tests on every push/PR to `main`
2. Builds the production bundle
3. Deploys to the `gh-pages` branch

To set up GitHub Pages:
1. Go to repo Settings > Pages
2. Set Source to "Deploy from a branch"
3. Select `gh-pages` branch

## Game Controls

| Action | Buttons Mode | Swipe Mode | Keyboard |
|--------|-------------|------------|----------|
| Steer Left | Left button | Swipe left | Left arrow |
| Steer Right | Right button | Swipe right | Right arrow |
| Jump | Jump button | Swipe up / Jump button | Space |

## Game Modes

- **Classic**: Race with 7 AI bots on a preset track with obstacles and powerups
- **Time Trial**: Solo race against the clock
- **Chaos**: Randomized obstacles, more powerups, moving bumpers
- **Custom**: Configure bot count, difficulty, and match length

## AI Bot Profiles

| Profile | Speed | Aggression | Jump Freq | Risk |
|---------|-------|------------|-----------|------|
| Casual | Low | Low | Low | Low |
| Aggressive | High | High | Medium | High |
| Speedster | Very High | Low | Medium | Medium |
| Trickster | Medium | Low | Very High | High |
| Adaptive | Medium | Medium | Medium | Medium |

## Powerups

- **Speed Boost** (gold star): 3 seconds of 1.5x speed
- **Shield** (blue circle): 4 seconds of collision immunity
- **Jump Boost** (green triangle): 5 seconds of enhanced jumps

## Project Structure

```
src/
  game/
    main.ts          # Game entry point and Phaser config
    engine.ts        # Deterministic physics engine
    types.ts         # TypeScript types and constants
    track.ts         # Track generation (prebuilt + procedural)
    audio.ts         # Audio manager with Web Audio API
    scenes/
      BootScene.ts   # Asset generation and loading
      MenuScene.ts   # Main menu
      GameScene.ts   # Core gameplay
      ResultsScene.ts # Race results
      ReplayScene.ts # Replay viewer
      SettingsScene.ts # Settings
    ui/
      HUD.ts         # Heads-up display
      Controls.ts    # Touch/keyboard controls
  ai/
    botProfiles.ts   # AI behavior parameters
    botController.ts # FSM-based AI controller
  storage/
    storage.ts       # localStorage abstraction
  tests/
    unit/            # Jest unit tests
    e2e/             # Playwright E2E tests
public/
  manifest.json      # PWA manifest
  service-worker.js  # Offline caching
```

## License

MIT

# CLAUDE.md - Aqua Park Development Guide

## Quick Reference

```bash
npm run dev       # Dev server on http://localhost:3000
npm run build     # tsc + vite build → dist/
npm run lint      # TypeScript type check (tsc --noEmit)
npm test          # Jest unit tests (55 tests, ~3s)
npm run e2e       # Playwright E2E tests (requires browser install)
npm run preview   # Preview production build
```

## Project Overview

Water slide racing PWA using **Phaser 3.70** + **TypeScript 5.3** + **Vite 5**.
Pseudo-3D rendering (OutRun-style perspective projection) on Canvas — NOT WebGL.
Game resolution: **390×844px** (portrait mobile, scales via Phaser.Scale.FIT).
All visual assets are **procedurally generated** in BootScene (no sprite files).

## Architecture

### Scene Flow
```
BootScene → MenuScene → GameScene → ResultsScene → MenuScene
                      → SettingsScene → MenuScene
                      → ReplayScene → MenuScene
```

### Core Systems
- **Physics** (`src/game/engine.ts`): Fixed timestep 1/60s for deterministic replay. Handles acceleration, lateral movement, jumping, collisions, powerups.
- **Rendering** (`src/game/scenes/GameScene.ts`): Pseudo-3D projection. Segments projected with `scale = CAMERA_DEPTH / dz`. Player at fixed screen position, world drawn back-to-front.
- **AI** (`src/ai/botController.ts`): FSM with states: `race | avoidObstacle | chase | usePowerup | recover`. 5 profiles in `botProfiles.ts`.
- **Input** (`src/game/ui/Controls.ts`): Three schemes — buttons (default), swipe, device tilt. Keyboard arrows+space always work as fallback.
- **Storage** (`src/storage/storage.ts`): localStorage wrapper with async API. Stores stats, settings, last 20 replays.

## Key Files

| File | What it does |
|------|-------------|
| `src/game/main.ts` | Phaser config, game entry point |
| `src/game/engine.ts` | Physics engine, collision, powerups, SeededRNG |
| `src/game/types.ts` | All TypeScript interfaces and constants |
| `src/game/track.ts` | Track generation (classic preset + procedural) |
| `src/game/scenes/GameScene.ts` | Main game loop, pseudo-3D renderer, HUD |
| `src/game/ui/Controls.ts` | Touch/keyboard/tilt input handling |
| `src/ai/botController.ts` | Bot AI (FSM-based decisions) |
| `src/ai/botProfiles.ts` | 5 bot personality definitions |
| `src/game/audio.ts` | Web Audio API SFX (placeholder tones) |
| `src/game/replayCodec.ts` | Replay serialization for URL sharing |
| `src/storage/storage.ts` | localStorage abstraction |

## Camera System (GameScene.ts top)

```typescript
const CAMERA_HEIGHT = 450;    // Height above track (lower = more zoomed out)
const CAMERA_DEPTH = 200;     // Perspective intensity (higher = less steep)
const DRAW_DISTANCE = 200;    // Segments ahead to render
const SEGMENT_LENGTH = 30;    // World units per render segment
const ROAD_WIDTH = 1200;      // Track width in world units
```

Player character: rendered at `screenY = h * 0.82`, `scale = 0.5`, `baseSize = scale * 200`.

## Physics Constants (engine.ts)

```typescript
FIXED_DT: 1/60, MAX_FORWARD_SPEED: 400, FORWARD_ACCEL: 120,
LATERAL_SPEED: 280, LATERAL_ACCEL: 1200, LATERAL_FRICTION: 800,
JUMP_DURATION: 0.5, STUN_DURATION: 0.4, COLLISION_RADIUS: 20,
SPEED_BOOST_MULT: 1.5 (3s), SHIELD_DURATION: 4, JUMP_BOOST_DURATION: 5
```

## Game Modes

| Mode | Bots | Track | Notes |
|------|------|-------|-------|
| Classic | 7 | Preset 11-segment course | Default mode |
| Time Trial | 0 | Preset | Solo run |
| Chaos | Configurable | Procedural, more obstacles | Harder |
| Custom | 1-15 | Configurable | Full settings |

## Important Types

- **PlayerState**: Position, speed, timers, powerup state, finish info
- **TrackSegment**: Type, length, lanes, obstacles[], powerups[], friction, slope
- **GameSettings**: Audio, controls, quality, botCount, matchLength
- **ReplayData**: Seed + frame-by-frame input recording for deterministic replay
- **InputState**: `{ left: boolean, right: boolean, jump: boolean }`

## Conventions

- **Naming**: PascalCase classes, camelCase functions, UPPER_SNAKE constants
- **Booleans**: `is`/`has` prefix (`isJumping`, `hasShield`, `finished`)
- **Pure functions**: Physics/collision logic exported as standalone functions in engine.ts
- **Rendering**: All done via `Phaser.GameObjects.Graphics` (no sprites)
- **Determinism**: SeededRNG + fixed timestep = identical replays

## Testing

- **Unit tests** in `src/tests/unit/` — physics, AI, storage, replay codec
- **E2E tests** in `src/tests/e2e/` — Playwright on iPhone 13 Pro & Pixel 9
- Jest config: `jest.config.cjs` (ts-jest preset, node environment)
- Tests excluded from tsconfig compilation

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. lint → test → build on every push/PR to main
2. Deploy `dist/` to `gh-pages` branch on main pushes

## PWA

- `public/manifest.json` — standalone portrait app
- `public/service-worker.js` — cache-first for assets, network-first for HTML
- Icons: `icon-192.png`, `icon-512.png`

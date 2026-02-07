# Assets Documentation - Aqua Park PWA

## Placeholder Assets

All game assets are generated procedurally at runtime in `BootScene.ts`. No external image or audio files are required. This approach:
- Eliminates asset loading latency
- Keeps the bundle extremely small
- Ensures offline-first operation
- Makes asset replacement straightforward

## Visual Assets (Procedurally Generated)

| Asset Key | Description | Size | How to Replace |
|-----------|-------------|------|----------------|
| `player_0` through `player_7` | Player characters with colored tubes | 40x48 | Replace `generatePlayerTextures()` with sprite sheet loading |
| `slide_tile` | Blue water slide tile | 64x64 | Replace with textured tile image |
| `water_tile` | Light blue water surface | 64x64 | Replace with animated water tile |
| `ramp` | Orange ramp indicator | 64x64 | Replace with 3D-rendered ramp sprite |
| `barrel` | Brown barrel obstacle | 32x32 | Replace with barrel sprite sheet |
| `ring` | Red ring obstacle | 32x32 | Replace with ring sprite |
| `bumper` | Red/orange bumper obstacle | 32x32 | Replace with animated bumper |
| `powerup_speed` | Gold star speed boost | 32x32 | Replace with animated powerup sprite |
| `powerup_shield` | Blue circle shield | 32x32 | Replace with shield effect sprite |
| `powerup_jump` | Green triangle jump boost | 32x32 | Replace with jump powerup sprite |
| `pool` | Finish line pool | 256x128 | Replace with pool image |
| `splash_particle` | Water splash particle | 8x8 | Replace with water droplet sprite |
| `speed_line` | White speed effect line | 2x16 | Replace with motion blur texture |
| `confetti` | Square confetti piece | 6x6 | Replace with confetti sprite sheet |
| `btn_base` | Control button background | 80x80 | Replace with button nine-slice |
| `arrow_left/right` | Directional arrows | 64x64 | Replace with arrow icons |
| `jump_icon` | Jump button icon | 64x64 | Replace with jump icon |
| `bg_sky` | Sky parallax background | 390x256 | Replace with sky panorama |
| `bg_mountains` | Mountain parallax layer | 390x200 | Replace with mountain artwork |
| `side_rail` | Slide side rail | 16x64 | Replace with rail texture |
| `shield_effect` | Shield overlay circle | 40x40 | Replace with animated shield |
| `minimap_bg` | Mini-map background | 60x120 | Replace with mini-map frame |

## Audio Assets (Web Audio API Generated)

All sounds are generated using the Web Audio API oscillators as placeholders.

| Sound | Description | Duration | How to Replace |
|-------|-------------|----------|----------------|
| Music | Simple sine wave melody | Looping | Replace `playMusic()` with Howler.js + MP3/OGG file |
| Jump SFX | Rising pitch sine | 0.2s | Replace with WAV/OGG jump sound |
| Collision SFX | Falling pitch sawtooth | 0.2s | Replace with WAV/OGG impact sound |
| Splash SFX | Descending sine sweep | 0.5s | Replace with WAV/OGG splash sound |
| Powerup SFX | Ascending note sequence | 0.3s | Replace with WAV/OGG chime sound |
| Win SFX | Four-note ascending | 0.8s | Replace with WAV/OGG fanfare |
| Click SFX | Brief sine blip | 0.05s | Replace with WAV/OGG click sound |

## PWA Icons

| File | Size | Format | Location |
|------|------|--------|----------|
| `icon-192.png` | 192x192 | SVG (named .png) | `public/` |
| `icon-512.png` | 512x512 | SVG (named .png) | `public/` |

**Note**: These are SVG files with PNG extensions for simplicity. For production, convert to actual PNG using a tool like Sharp, ImageMagick, or an online converter.

## How to Replace Assets

### Visual Assets
1. Add image files to `src/assets/images/` or `src/assets/spritesheets/`
2. In `BootScene.ts`, replace `generatePlaceholderAssets()` with `this.load.image()` or `this.load.spritesheet()` calls
3. Keep the same texture keys so the rest of the game code works unchanged

### Audio Assets
1. Add audio files (OGG + MP3 for cross-browser) to `src/assets/audio/`
2. Install Howler.js: already in `package.json`
3. Replace `AudioManager` methods to use `Howl` instances instead of Web Audio API oscillators
4. Use audio sprites for SFX to minimize HTTP requests

### PWA Icons
1. Create proper PNG icons at 192x192 and 512x512
2. Replace files in `public/` directory
3. Consider adding more sizes (72, 96, 128, 144, 256, 384) to `manifest.json`

## Recommended Free Asset Sources

- **Kenney.nl**: Free game assets (CC0) - kenney.nl
- **OpenGameArt.org**: Community game assets - opengameart.org
- **Freesound.org**: Free sound effects - freesound.org
- **Incompetech.com**: Royalty-free music - incompetech.com

## Attribution

All current assets are original procedurally generated placeholders created for this project. No third-party assets are used. When replacing with external assets, add attribution here as required by their licenses.

# Test Plan - Aqua Park PWA

## Automated Tests

### Unit Tests (Jest)
- Physics engine: velocity, acceleration, collision resolution
- AI decision logic: FSM transitions, lane scoring, profile differences
- Storage API: save/load stats, settings, replays
- Replay serialization: encode/decode round-trip, input preservation

### E2E Tests (Playwright)
- App loads and shows menu on iPhone 13 Pro and Pixel 9
- Page title is correct
- PWA manifest is accessible
- Service worker registration attempt
- Canvas renders with valid dimensions

## Manual Test Plan

### 1. Installation & PWA
- [ ] Open app in Chrome on mobile
- [ ] Verify "Add to Home Screen" prompt appears
- [ ] Install to home screen
- [ ] Launch from home screen (standalone mode, no browser UI)
- [ ] Turn off WiFi/data, launch app, verify it loads offline
- [ ] Verify assets display correctly offline

### 2. Menu & Navigation
- [ ] Title screen displays with all mode buttons
- [ ] Each mode button transitions to game
- [ ] Settings button opens settings screen
- [ ] Replays button opens replay list
- [ ] Stats display shows accurate counts
- [ ] Back navigation works from all screens

### 3. Touch Controls - Buttons
- [ ] Left button steers player left
- [ ] Right button steers player right
- [ ] Jump button triggers jump animation
- [ ] Buttons are large enough for thumb interaction
- [ ] Multi-touch works (steer + jump simultaneously)
- [ ] No accidental taps from normal grip

### 4. Touch Controls - Swipe
- [ ] Switch to swipe mode in settings
- [ ] Swipe left steers player left
- [ ] Swipe right steers player right
- [ ] Swipe up triggers jump
- [ ] Deadzone prevents accidental steering
- [ ] Jump button still available in swipe mode

### 5. Touch Controls - Tilt
- [ ] Enable tilt toggle in settings
- [ ] Device tilt steers player
- [ ] Tilt calibrates on start
- [ ] Sensitivity is comfortable

### 6. Gameplay - Classic Mode
- [ ] Race starts after 3-2-1-GO countdown
- [ ] Player slides downhill with increasing speed
- [ ] Obstacles (barrels, rings, bumpers) are visible
- [ ] Collisions with obstacles slow/stun the player
- [ ] Powerups are collectible (speed boost, shield, jump boost)
- [ ] Shield prevents collision stun
- [ ] Speed boost visually shows speed lines
- [ ] Race ends at finish pool or time limit
- [ ] Results screen shows positions and scores

### 7. AI Bots
- [ ] Bots appear and race alongside player
- [ ] Different bot profiles show distinct behavior:
  - Casual: slower, avoids collisions
  - Aggressive: seeks collisions, pushes others
  - Speedster: takes optimal line, seeks boosts
  - Trickster: jumps frequently
  - Adaptive: adjusts based on player position
- [ ] Bots navigate around obstacles (not perfectly)
- [ ] Bots collect powerups
- [ ] Run 5+ races and verify varied results

### 8. Replay System
- [ ] Complete a race and verify replay is saved
- [ ] Open Replays screen and see saved replay
- [ ] Tap Play to watch replay
- [ ] Replay matches original race behavior
- [ ] Share button copies URL to clipboard
- [ ] Shared URL opens and plays replay (when pasted)

### 9. Settings
- [ ] Master volume slider works
- [ ] Music volume slider works
- [ ] SFX volume slider works
- [ ] Mute toggle mutes all audio
- [ ] Control scheme selector switches between modes
- [ ] Quality selector changes graphics level
- [ ] Bot count slider adjusts number of bots
- [ ] Match length slider adjusts time limit
- [ ] Save & Back persists settings
- [ ] Reset restores defaults

### 10. Audio
- [ ] Background music plays during gameplay
- [ ] Jump SFX plays on jump
- [ ] Collision SFX plays on collision
- [ ] Splash SFX plays on finish
- [ ] Powerup SFX plays on collection
- [ ] Win fanfare plays on results screen
- [ ] Mute setting persists across sessions
- [ ] Audio doesn't play before user interaction (browser policy)

### 11. Performance
- [ ] Target 60 FPS on iPhone 13 Pro (check with Safari inspector)
- [ ] Target 60 FPS on Pixel 9 (check with Chrome DevTools)
- [ ] Fallback to 30 FPS if needed on lower-end devices
- [ ] No visible stuttering during normal gameplay
- [ ] Particle effects don't cause frame drops
- [ ] Memory usage stays stable during long sessions

### 12. Edge Cases
- [ ] Rapid tap spam on controls doesn't crash
- [ ] Orientation change during gameplay recovers correctly
- [ ] Background/foreground app switching during gameplay
- [ ] Low memory scenario (many browser tabs open)
- [ ] Offline mid-run: game continues with cached assets
- [ ] Very fast/slow match lengths (15s, 120s)
- [ ] Maximum bots (15) runs smoothly
- [ ] Minimum bots (1) works correctly

### 13. Cross-Browser
- [ ] Chrome mobile (Android)
- [ ] Safari mobile (iOS)
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Edge desktop

/**
 * Unit tests for the core physics engine.
 */
import {
  SeededRNG,
  createPlayerState,
  updatePlayerPhysics,
  checkPlayerCollision,
  resolveCollision,
  applyPowerup,
  applyObstacleEffect,
  calculateScore,
  PHYSICS,
} from '../../game/engine';
import { TrackSegment } from '../../game/types';

// Helper: create a default track segment
function defaultSegment(): TrackSegment {
  return {
    type: 'straight',
    length: 500,
    lanes: 5,
    friction: 0.98,
    slope: -0.5,
    obstacles: [],
    powerups: [],
  };
}

describe('SeededRNG', () => {
  test('produces deterministic results with same seed', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());
    expect(values1).toEqual(values2);
  });

  test('produces different results with different seeds', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(123);
    const v1 = rng1.next();
    const v2 = rng2.next();
    expect(v1).not.toEqual(v2);
  });

  test('nextInt returns values within range', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(0, 10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
    }
  });

  test('nextFloat returns values within range', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextFloat(1.5, 3.5);
      expect(val).toBeGreaterThanOrEqual(1.5);
      expect(val).toBeLessThanOrEqual(3.5);
    }
  });

  test('next returns values between 0 and 1', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});

describe('createPlayerState', () => {
  test('creates player with correct initial values', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    expect(player.id).toBe('p1');
    expect(player.name).toBe('Test');
    expect(player.lane).toBe(2);
    expect(player.isBot).toBe(false);
    expect(player.forwardSpeed).toBe(0);
    expect(player.distanceTraveled).toBe(0);
    expect(player.isJumping).toBe(false);
    expect(player.finished).toBe(false);
  });

  test('creates bot with profile', () => {
    const bot = createPlayerState('b1', 'Bot 1', 3, true, 1, 'aggressive');
    expect(bot.isBot).toBe(true);
    expect(bot.botProfile).toBe('aggressive');
    expect(bot.skinIndex).toBe(1);
  });
});

describe('updatePlayerPhysics', () => {
  test('player accelerates forward over time', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    const segment = defaultSegment();
    const noInput = { left: false, right: false, jump: false };

    updatePlayerPhysics(player, noInput, segment, PHYSICS.FIXED_DT);
    expect(player.forwardSpeed).toBeGreaterThan(0);
    expect(player.distanceTraveled).toBeGreaterThan(0);
  });

  test('left input moves player left', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    const segment = defaultSegment();
    const startX = player.x;

    for (let i = 0; i < 30; i++) {
      updatePlayerPhysics(player, { left: true, right: false, jump: false }, segment, PHYSICS.FIXED_DT);
    }
    expect(player.x).toBeLessThan(startX);
  });

  test('right input moves player right', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    const segment = defaultSegment();
    const startX = player.x;

    for (let i = 0; i < 30; i++) {
      updatePlayerPhysics(player, { left: false, right: true, jump: false }, segment, PHYSICS.FIXED_DT);
    }
    expect(player.x).toBeGreaterThan(startX);
  });

  test('jump sets isJumping flag', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    const segment = defaultSegment();

    updatePlayerPhysics(player, { left: false, right: false, jump: true }, segment, PHYSICS.FIXED_DT);
    expect(player.isJumping).toBe(true);
    expect(player.jumpTimer).toBeGreaterThan(0);
  });

  test('stunned player does not move laterally', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    player.stunTimer = 1;
    const segment = defaultSegment();
    const startX = player.x;

    updatePlayerPhysics(player, { left: true, right: false, jump: false }, segment, PHYSICS.FIXED_DT);
    expect(player.x).toBe(startX);
  });

  test('finished player is not updated', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    player.finished = true;
    const segment = defaultSegment();
    const startDist = player.distanceTraveled;

    updatePlayerPhysics(player, { left: false, right: false, jump: false }, segment, PHYSICS.FIXED_DT);
    expect(player.distanceTraveled).toBe(startDist);
  });

  test('speed boost increases speed', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    player.speedBoostTimer = 3;
    const segment = defaultSegment();

    // Run several frames
    for (let i = 0; i < 60; i++) {
      updatePlayerPhysics(player, { left: false, right: false, jump: false }, segment, PHYSICS.FIXED_DT);
    }
    const boostedSpeed = player.forwardSpeed;

    const normalPlayer = createPlayerState('p2', 'Normal', 2, false, 0);
    for (let i = 0; i < 60; i++) {
      updatePlayerPhysics(normalPlayer, { left: false, right: false, jump: false }, segment, PHYSICS.FIXED_DT);
    }
    expect(boostedSpeed).toBeGreaterThan(normalPlayer.forwardSpeed);
  });

  test('player stays within slide bounds', () => {
    const player = createPlayerState('p1', 'Test', 0, false, 0);
    const segment = defaultSegment();

    // Push hard left for many frames
    for (let i = 0; i < 120; i++) {
      updatePlayerPhysics(player, { left: true, right: false, jump: false }, segment, PHYSICS.FIXED_DT);
    }
    const halfWidth = (segment.lanes * PHYSICS.LANE_WIDTH) / 2;
    const centerX = PHYSICS.SLIDE_WIDTH / 2;
    expect(player.x).toBeGreaterThanOrEqual(centerX - halfWidth);
  });
});

describe('checkPlayerCollision', () => {
  test('detects collision when players are close', () => {
    const a = createPlayerState('a', 'A', 2, false, 0);
    const b = createPlayerState('b', 'B', 2, false, 1);
    b.x = a.x + 10;
    b.distanceTraveled = a.distanceTraveled + 5;
    expect(checkPlayerCollision(a, b)).toBe(true);
  });

  test('no collision when far apart', () => {
    const a = createPlayerState('a', 'A', 0, false, 0);
    const b = createPlayerState('b', 'B', 4, false, 1);
    b.x = a.x + 200;
    expect(checkPlayerCollision(a, b)).toBe(false);
  });

  test('no collision when one is jumping', () => {
    const a = createPlayerState('a', 'A', 2, false, 0);
    const b = createPlayerState('b', 'B', 2, false, 1);
    b.x = a.x + 5;
    a.isJumping = true;
    expect(checkPlayerCollision(a, b)).toBe(false);
  });

  test('no collision when one is finished', () => {
    const a = createPlayerState('a', 'A', 2, false, 0);
    const b = createPlayerState('b', 'B', 2, false, 1);
    b.x = a.x + 5;
    a.finished = true;
    expect(checkPlayerCollision(a, b)).toBe(false);
  });
});

describe('resolveCollision', () => {
  test('pushes players apart and stuns them', () => {
    const a = createPlayerState('a', 'A', 2, false, 0);
    const b = createPlayerState('b', 'B', 2, false, 1);
    a.x = 100;
    b.x = 110;

    resolveCollision(a, b);
    expect(a.stunTimer).toBeGreaterThan(0);
    expect(b.stunTimer).toBeGreaterThan(0);
    expect(Math.abs(a.lateralSpeed)).toBeGreaterThan(0);
    expect(Math.abs(b.lateralSpeed)).toBeGreaterThan(0);
  });

  test('shield protects from stun', () => {
    const a = createPlayerState('a', 'A', 2, false, 0);
    const b = createPlayerState('b', 'B', 2, false, 1);
    a.hasShield = true;
    a.x = 100;
    b.x = 110;

    resolveCollision(a, b);
    expect(a.stunTimer).toBe(0);
    expect(b.stunTimer).toBeGreaterThan(0);
  });
});

describe('applyPowerup', () => {
  test('speed boost sets timer', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    applyPowerup(player, 'speed_boost');
    expect(player.speedBoostTimer).toBe(PHYSICS.SPEED_BOOST_DURATION);
  });

  test('shield sets flag and timer', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    applyPowerup(player, 'shield');
    expect(player.hasShield).toBe(true);
    expect(player.shieldTimer).toBe(PHYSICS.SHIELD_DURATION);
  });

  test('jump boost sets timer', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    applyPowerup(player, 'jump_boost');
    expect(player.jumpBoostTimer).toBe(PHYSICS.JUMP_BOOST_DURATION);
  });
});

describe('applyObstacleEffect', () => {
  test('barrel slows player and stuns', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    player.forwardSpeed = 200;
    applyObstacleEffect(player, 'barrel');
    expect(player.forwardSpeed).toBe(140);
    expect(player.stunTimer).toBeGreaterThan(0);
  });

  test('shield prevents obstacle effects', () => {
    const player = createPlayerState('p1', 'Test', 2, false, 0);
    player.forwardSpeed = 200;
    player.hasShield = true;
    applyObstacleEffect(player, 'barrel');
    expect(player.forwardSpeed).toBe(200);
    expect(player.stunTimer).toBe(0);
  });
});

describe('calculateScore', () => {
  test('first place gets highest score', () => {
    const first = calculateScore(1, 8, 30, 45);
    const last = calculateScore(8, 8, 30, 45);
    expect(first).toBeGreaterThan(last);
  });

  test('faster time gives higher score', () => {
    const fast = calculateScore(1, 8, 20, 45);
    const slow = calculateScore(1, 8, 40, 45);
    expect(fast).toBeGreaterThan(slow);
  });

  test('returns non-negative score', () => {
    const score = calculateScore(8, 8, 60, 45);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

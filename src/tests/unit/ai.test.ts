/**
 * Unit tests for AI bot system.
 */
import { BotController } from '../../ai/botController';
import { BOT_PROFILES, createRandomProfile } from '../../ai/botProfiles';
import { SeededRNG, createPlayerState } from '../../game/engine';
import { TrackSegment, BotProfileType } from '../../game/types';

function defaultSegment(): TrackSegment {
  return {
    type: 'straight',
    length: 500,
    lanes: 5,
    friction: 0.98,
    slope: -0.5,
    obstacles: [
      { type: 'barrel', lane: 2, position: 0.5 },
    ],
    powerups: [
      { type: 'speed_boost', lane: 0, position: 0.3 },
    ],
  };
}

describe('BotController', () => {
  test('creates controller for each profile type', () => {
    const rng = new SeededRNG(42);
    const profiles: BotProfileType[] = ['casual', 'aggressive', 'speedster', 'trickster', 'adaptive'];
    profiles.forEach(p => {
      const controller = new BotController(p, rng);
      expect(controller.getProfile().type).toBe(p);
      expect(controller.getState()).toBe('race');
    });
  });

  test('generates valid input', () => {
    const rng = new SeededRNG(42);
    const controller = new BotController('casual', rng);
    const bot = createPlayerState('b1', 'Bot', 2, true, 1, 'casual');
    const players = [
      createPlayerState('p1', 'Player', 2, false, 0),
      bot,
    ];
    const segment = defaultSegment();

    const input = controller.update(bot, players, segment, rng);
    expect(typeof input.left).toBe('boolean');
    expect(typeof input.right).toBe('boolean');
    expect(typeof input.jump).toBe('boolean');
  });

  test('different profiles produce different behavior patterns', () => {
    const segment = defaultSegment();
    const results: Map<string, string> = new Map();

    const profiles: BotProfileType[] = ['casual', 'aggressive', 'speedster', 'trickster'];
    profiles.forEach(profileType => {
      const rng = new SeededRNG(42);
      const controller = new BotController(profileType, rng);
      const bot = createPlayerState('b1', 'Bot', 2, true, 1, profileType);
      const players = [createPlayerState('p1', 'Player', 2, false, 0), bot];

      let pattern = '';
      for (let i = 0; i < 60; i++) {
        const input = controller.update(bot, players, segment, rng);
        pattern += (input.left ? 'L' : '.') + (input.right ? 'R' : '.') + (input.jump ? 'J' : '.');
      }

      results.set(profileType, pattern);
    });

    // Different profiles should produce different behavior patterns
    const patterns = Array.from(results.values());
    const uniquePatterns = new Set(patterns);
    expect(uniquePatterns.size).toBeGreaterThan(1);
  });

  test('controller enters recover state when stunned', () => {
    const rng = new SeededRNG(42);
    const controller = new BotController('casual', rng);
    const bot = createPlayerState('b1', 'Bot', 2, true, 1, 'casual');
    bot.stunTimer = 1;
    const players = [bot];
    const segment = defaultSegment();

    controller.update(bot, players, segment, rng);
    expect(controller.getState()).toBe('recover');
  });

  test('deterministic behavior with same seed', () => {
    const segment = defaultSegment();
    const results: boolean[][] = [];

    for (let run = 0; run < 2; run++) {
      const rng = new SeededRNG(42);
      const controller = new BotController('speedster', rng);
      const bot = createPlayerState('b1', 'Bot', 2, true, 1, 'speedster');
      const players = [createPlayerState('p1', 'Player', 2, false, 0), bot];
      const runResults: boolean[] = [];

      for (let i = 0; i < 60; i++) {
        const input = controller.update(bot, players, segment, rng);
        runResults.push(input.left, input.right, input.jump);
      }
      results.push(runResults);
    }

    expect(results[0]).toEqual(results[1]);
  });
});

describe('BotProfiles', () => {
  test('all profiles have required fields', () => {
    const profiles = Object.values(BOT_PROFILES);
    profiles.forEach(p => {
      expect(p.type).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.targetSpeedFactor).toBeGreaterThanOrEqual(0);
      expect(p.targetSpeedFactor).toBeLessThanOrEqual(1);
      expect(p.reactionDelay).toBeGreaterThanOrEqual(0);
      expect(p.mistakeChance).toBeGreaterThanOrEqual(0);
      expect(p.mistakeChance).toBeLessThanOrEqual(1);
    });
  });

  test('aggressive profile has higher collision aggression', () => {
    expect(BOT_PROFILES.aggressive.collisionAggression)
      .toBeGreaterThan(BOT_PROFILES.casual.collisionAggression);
  });

  test('speedster has higher target speed than casual', () => {
    expect(BOT_PROFILES.speedster.targetSpeedFactor)
      .toBeGreaterThan(BOT_PROFILES.casual.targetSpeedFactor);
  });

  test('createRandomProfile generates valid profile', () => {
    const profile = createRandomProfile(42);
    expect(profile.targetSpeedFactor).toBeGreaterThanOrEqual(0);
    expect(profile.targetSpeedFactor).toBeLessThanOrEqual(1);
  });
});

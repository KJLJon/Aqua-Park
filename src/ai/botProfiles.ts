/**
 * Bot AI profiles with tunable parameters.
 * Each profile defines behavior tendencies for the FSM-based bot controller.
 */
import { BotProfileType } from '../game/types';

/** Bot behavior parameters */
export interface BotProfile {
  type: BotProfileType;
  name: string;

  // Speed & racing
  targetSpeedFactor: number;     // 0-1, how fast they try to go relative to max
  boostSeekRange: number;        // how far ahead they look for boosts
  optimalLineWeight: number;     // how much they stick to optimal racing line

  // Collision behavior
  collisionAggression: number;   // 0-1, how much they seek collisions
  collisionAvoidance: number;    // 0-1, how much they avoid collisions

  // Jump behavior
  jumpFrequency: number;         // 0-1, how often they jump
  jumpTimingPrecision: number;   // 0-1, how well they time jumps for boosts

  // Risk
  riskTolerance: number;         // 0-1, willingness to take risky moves
  obstacleAvoidRange: number;    // how far ahead they detect obstacles

  // Human-like imprecision
  steeringJitter: number;        // random steering noise amplitude
  reactionDelay: number;         // frames of delay before reacting
  mistakeChance: number;         // probability of making a wrong move per second

  // Adaptability
  adaptiveness: number;          // 0-1, how much they adjust based on player position
}

/** Predefined bot profiles */
export const BOT_PROFILES: Record<BotProfileType, BotProfile> = {
  casual: {
    type: 'casual',
    name: 'Casual',
    targetSpeedFactor: 0.7,
    boostSeekRange: 100,
    optimalLineWeight: 0.3,
    collisionAggression: 0.1,
    collisionAvoidance: 0.7,
    jumpFrequency: 0.2,
    jumpTimingPrecision: 0.3,
    riskTolerance: 0.2,
    obstacleAvoidRange: 120,
    steeringJitter: 0.15,
    reactionDelay: 8,
    mistakeChance: 0.1,
    adaptiveness: 0.1,
  },

  aggressive: {
    type: 'aggressive',
    name: 'Aggressive',
    targetSpeedFactor: 0.85,
    boostSeekRange: 150,
    optimalLineWeight: 0.4,
    collisionAggression: 0.8,
    collisionAvoidance: 0.2,
    jumpFrequency: 0.4,
    jumpTimingPrecision: 0.5,
    riskTolerance: 0.8,
    obstacleAvoidRange: 80,
    steeringJitter: 0.1,
    reactionDelay: 4,
    mistakeChance: 0.08,
    adaptiveness: 0.3,
  },

  speedster: {
    type: 'speedster',
    name: 'Speedster',
    targetSpeedFactor: 0.95,
    boostSeekRange: 200,
    optimalLineWeight: 0.8,
    collisionAggression: 0.2,
    collisionAvoidance: 0.5,
    jumpFrequency: 0.3,
    jumpTimingPrecision: 0.8,
    riskTolerance: 0.5,
    obstacleAvoidRange: 150,
    steeringJitter: 0.05,
    reactionDelay: 2,
    mistakeChance: 0.04,
    adaptiveness: 0.2,
  },

  trickster: {
    type: 'trickster',
    name: 'Trickster',
    targetSpeedFactor: 0.75,
    boostSeekRange: 120,
    optimalLineWeight: 0.3,
    collisionAggression: 0.3,
    collisionAvoidance: 0.3,
    jumpFrequency: 0.8,
    jumpTimingPrecision: 0.7,
    riskTolerance: 0.7,
    obstacleAvoidRange: 100,
    steeringJitter: 0.12,
    reactionDelay: 5,
    mistakeChance: 0.06,
    adaptiveness: 0.2,
  },

  adaptive: {
    type: 'adaptive',
    name: 'Adaptive',
    targetSpeedFactor: 0.8,
    boostSeekRange: 160,
    optimalLineWeight: 0.6,
    collisionAggression: 0.4,
    collisionAvoidance: 0.4,
    jumpFrequency: 0.4,
    jumpTimingPrecision: 0.6,
    riskTolerance: 0.5,
    obstacleAvoidRange: 130,
    steeringJitter: 0.08,
    reactionDelay: 3,
    mistakeChance: 0.05,
    adaptiveness: 0.9,
  },
};

/** Create a randomized bot profile mixing parameters from existing profiles */
export function createRandomProfile(seed: number): BotProfile {
  const profiles = Object.values(BOT_PROFILES);
  const mix = (key: keyof BotProfile) => {
    const values = profiles.map(p => p[key] as number);
    const idx = Math.floor(((seed * 1664525 + 1013904223) & 0xFFFFFFFF) / 0xFFFFFFFF * values.length);
    return values[Math.abs(idx) % values.length];
  };

  return {
    type: 'adaptive',
    name: 'Random',
    targetSpeedFactor: mix('targetSpeedFactor') as number,
    boostSeekRange: mix('boostSeekRange') as number,
    optimalLineWeight: mix('optimalLineWeight') as number,
    collisionAggression: mix('collisionAggression') as number,
    collisionAvoidance: mix('collisionAvoidance') as number,
    jumpFrequency: mix('jumpFrequency') as number,
    jumpTimingPrecision: mix('jumpTimingPrecision') as number,
    riskTolerance: mix('riskTolerance') as number,
    obstacleAvoidRange: mix('obstacleAvoidRange') as number,
    steeringJitter: mix('steeringJitter') as number,
    reactionDelay: mix('reactionDelay') as number,
    mistakeChance: mix('mistakeChance') as number,
    adaptiveness: mix('adaptiveness') as number,
  };
}

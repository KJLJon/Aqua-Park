/**
 * Bot AI Controller - FSM-based bot decision making.
 * Uses lane scoring and proximity checks for navigation.
 */
import { PlayerState, InputState, TrackSegment, BotProfileType } from '../game/types';
import { PHYSICS, SeededRNG } from '../game/engine';
import { BotProfile, BOT_PROFILES } from './botProfiles';

/** FSM States for bot behavior */
export type BotState = 'race' | 'avoidObstacle' | 'chase' | 'usePowerup' | 'recover';

/**
 * BotController - Manages AI decision-making for a single bot.
 */
export class BotController {
  private profile: BotProfile;
  private state: BotState = 'race';
  private stateTimer = 0;
  private reactionBuffer: InputState[] = [];
  private targetLane = 2;
  private frameCount = 0;

  constructor(profileType: BotProfileType, _rng: SeededRNG) {
    this.profile = BOT_PROFILES[profileType];

    // Fill reaction buffer with neutral inputs
    for (let i = 0; i < this.profile.reactionDelay; i++) {
      this.reactionBuffer.push({ left: false, right: false, jump: false });
    }
  }

  /**
   * Update the bot AI and return input for this frame.
   */
  update(
    bot: PlayerState,
    allPlayers: PlayerState[],
    segment: TrackSegment,
    rng: SeededRNG
  ): InputState {
    this.frameCount++;
    this.stateTimer++;

    // Update FSM state
    this.updateState(bot, allPlayers, segment, rng);

    // Generate raw input based on current state
    const rawInput = this.generateInput(bot, allPlayers, segment, rng);

    // Add to reaction buffer (simulates reaction delay)
    this.reactionBuffer.push(rawInput);
    const delayedInput = this.reactionBuffer.shift()!;

    // Add steering jitter for human-like imprecision
    if (rng.next() < this.profile.steeringJitter) {
      if (rng.next() > 0.5) {
        delayedInput.left = !delayedInput.left;
      } else {
        delayedInput.right = !delayedInput.right;
      }
    }

    // Random mistakes
    if (rng.next() < this.profile.mistakeChance / 60) {
      delayedInput.left = rng.next() > 0.5;
      delayedInput.right = !delayedInput.left;
    }

    return delayedInput;
  }

  private updateState(
    bot: PlayerState,
    allPlayers: PlayerState[],
    _segment: TrackSegment,
    rng: SeededRNG
  ): void {
    // Recovery from stun
    if (bot.stunTimer > 0) {
      this.state = 'recover';
      this.stateTimer = 0;
      return;
    }

    // Check for nearby players to chase/avoid
    const nearbyPlayers = allPlayers.filter(p =>
      p.id !== bot.id && !p.finished &&
      Math.abs(p.distanceTraveled - bot.distanceTraveled) < 100 &&
      Math.abs(p.x - bot.x) < PHYSICS.SLIDE_WIDTH
    );

    // Adaptive behavior adjustment
    if (this.profile.adaptiveness > 0.5) {
      const humanPlayer = allPlayers.find(p => !p.isBot);
      if (humanPlayer && humanPlayer.distanceTraveled > bot.distanceTraveled + 100) {
        // Behind the player - become more aggressive
        this.profile.targetSpeedFactor = Math.min(1, this.profile.targetSpeedFactor + 0.1);
        this.profile.riskTolerance = Math.min(1, this.profile.riskTolerance + 0.1);
      }
    }

    // State transitions
    if (this.state === 'recover' && bot.stunTimer <= 0) {
      this.state = 'race';
      this.stateTimer = 0;
    }

    if (nearbyPlayers.length > 0 && this.profile.collisionAggression > rng.next()) {
      this.state = 'chase';
      this.stateTimer = 0;
    } else if (this.state === 'chase' && (nearbyPlayers.length === 0 || this.stateTimer > 120)) {
      this.state = 'race';
      this.stateTimer = 0;
    }

    // Check for powerup use
    if ((bot.speedBoostTimer > 0 || bot.hasShield || bot.jumpBoostTimer > 0) && rng.next() < 0.1) {
      this.state = 'usePowerup';
      this.stateTimer = 0;
    }

    // Default back to racing
    if (this.stateTimer > 180) {
      this.state = 'race';
      this.stateTimer = 0;
    }
  }

  private generateInput(
    bot: PlayerState,
    allPlayers: PlayerState[],
    segment: TrackSegment,
    rng: SeededRNG
  ): InputState {
    const input: InputState = { left: false, right: false, jump: false };

    switch (this.state) {
      case 'race':
        return this.raceInput(bot, segment, rng);
      case 'avoidObstacle':
        return this.avoidObstacleInput(bot, segment, rng);
      case 'chase':
        return this.chaseInput(bot, allPlayers, rng);
      case 'usePowerup':
        return this.powerupInput(bot, rng);
      case 'recover':
        return input; // Do nothing while stunned
    }
  }

  private raceInput(bot: PlayerState, segment: TrackSegment, rng: SeededRNG): InputState {
    const input: InputState = { left: false, right: false, jump: false };

    // Lane scoring: evaluate each lane
    this.targetLane = this.scoreLanes(bot, segment, rng);

    // Steer toward target lane
    const targetX = this.targetLane * PHYSICS.LANE_WIDTH + PHYSICS.LANE_WIDTH / 2;
    const diff = targetX - bot.x;
    const threshold = 10;

    if (diff < -threshold) {
      input.left = true;
    } else if (diff > threshold) {
      input.right = true;
    }

    // Jump decisions
    if (segment.type === 'ramp' && rng.next() < this.profile.jumpTimingPrecision) {
      input.jump = true;
    } else if (rng.next() < this.profile.jumpFrequency / 120) {
      input.jump = true;
    }

    return input;
  }

  private avoidObstacleInput(bot: PlayerState, segment: TrackSegment, rng: SeededRNG): InputState {
    const input: InputState = { left: false, right: false, jump: false };

    // Move to the lane with fewest obstacles
    const safeLane = this.findSafestLane(bot, segment);
    const targetX = safeLane * PHYSICS.LANE_WIDTH + PHYSICS.LANE_WIDTH / 2;
    const diff = targetX - bot.x;

    if (diff < -5) input.left = true;
    else if (diff > 5) input.right = true;

    // Jump over obstacle if close and risky enough
    if (rng.next() < this.profile.riskTolerance * 0.5) {
      input.jump = true;
    }

    return input;
  }

  private chaseInput(bot: PlayerState, allPlayers: PlayerState[], rng: SeededRNG): InputState {
    const input: InputState = { left: false, right: false, jump: false };

    // Find closest non-finished player
    const targets = allPlayers
      .filter(p => p.id !== bot.id && !p.finished)
      .sort((a, b) => {
        const da = Math.abs(a.distanceTraveled - bot.distanceTraveled) + Math.abs(a.x - bot.x);
        const db = Math.abs(b.distanceTraveled - bot.distanceTraveled) + Math.abs(b.x - bot.x);
        return da - db;
      });

    if (targets.length > 0) {
      const target = targets[0];
      const dx = target.x - bot.x;

      // Steer toward target for collision
      if (this.profile.collisionAggression > 0.5) {
        if (dx < -5) input.left = true;
        else if (dx > 5) input.right = true;
      } else {
        // Avoid collision
        if (dx < -5) input.right = true;
        else if (dx > 5) input.left = true;
      }
    }

    // Random jump during chase
    if (rng.next() < 0.02) input.jump = true;

    return input;
  }

  private powerupInput(bot: PlayerState, rng: SeededRNG): InputState {
    const input: InputState = { left: false, right: false, jump: false };

    // When having jump boost, use it
    if (bot.jumpBoostTimer > 0 && rng.next() < 0.05) {
      input.jump = true;
    }

    // Speed boost - stay in center lane
    if (bot.speedBoostTimer > 0) {
      const centerX = PHYSICS.SLIDE_WIDTH / 2;
      if (bot.x < centerX - 10) input.right = true;
      else if (bot.x > centerX + 10) input.left = true;
    }

    return input;
  }

  /**
   * Score each lane and return the best one.
   * Higher score = better lane to be in.
   */
  private scoreLanes(bot: PlayerState, segment: TrackSegment, rng: SeededRNG): number {
    const lanes = segment.lanes;
    const scores: number[] = [];

    for (let i = 0; i < lanes; i++) {
      let score = 0;

      // Center lane bias (optimal line)
      const centerDist = Math.abs(i - Math.floor(lanes / 2));
      score += (lanes - centerDist) * this.profile.optimalLineWeight * 10;

      // Obstacle avoidance
      segment.obstacles.forEach(obs => {
        if (obs.lane === i) {
          score -= 20 * this.profile.collisionAvoidance;
        }
      });

      // Powerup seeking
      segment.powerups.forEach(pu => {
        if (pu.lane === i) {
          score += 15 * this.profile.boostSeekRange / 200;
        }
      });

      // Random variation
      score += rng.nextFloat(-5, 5);

      scores.push(score);
    }

    // Find best lane
    let bestLane = 0;
    let bestScore = -Infinity;
    scores.forEach((s, i) => {
      if (s > bestScore) {
        bestScore = s;
        bestLane = i;
      }
    });

    return bestLane;
  }

  private findSafestLane(bot: PlayerState, segment: TrackSegment): number {
    const lanes = segment.lanes;
    const dangerPerLane: number[] = new Array(lanes).fill(0);

    segment.obstacles.forEach(obs => {
      if (obs.lane >= 0 && obs.lane < lanes) {
        dangerPerLane[obs.lane] += 10;
      }
    });

    let safestLane = bot.lane;
    let minDanger = Infinity;
    dangerPerLane.forEach((d, i) => {
      if (d < minDanger) {
        minDanger = d;
        safestLane = i;
      }
    });

    return safestLane;
  }

  getState(): BotState {
    return this.state;
  }

  getProfile(): BotProfile {
    return { ...this.profile };
  }
}

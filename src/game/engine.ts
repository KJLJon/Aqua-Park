/**
 * Core deterministic physics engine for Aqua Park.
 * Uses fixed timestep for deterministic replay support.
 */
import {
  PlayerState,
  InputState,
  TrackSegment,
  ObstacleType,
  PowerupType,
} from './types';

/** Physics constants */
export const PHYSICS = {
  FIXED_DT: 1 / 60,
  LANE_WIDTH: 50,
  MAX_LANES: 5,
  FORWARD_ACCEL: 120,
  MAX_FORWARD_SPEED: 400,
  LATERAL_SPEED: 280,
  LATERAL_ACCEL: 1200,
  LATERAL_FRICTION: 800,
  JUMP_FORCE: -250,
  JUMP_DURATION: 0.5,
  GRAVITY: 600,
  STUN_DURATION: 0.4,
  COLLISION_PUSH: 150,
  COLLISION_RADIUS: 20,
  SPEED_BOOST_MULT: 1.5,
  SPEED_BOOST_DURATION: 3,
  SHIELD_DURATION: 4,
  JUMP_BOOST_MULT: 1.5,
  JUMP_BOOST_DURATION: 5,
  LANDING_BOOST: 30,
  SLIDE_WIDTH: 250,
  FRICTION_DEFAULT: 0.98,
};

/** Seeded random number generator for deterministic gameplay */
export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** Returns a pseudo-random number between 0 and 1 */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (this.seed >>> 0) / 0xFFFFFFFF;
  }

  /** Returns a random integer between min (inclusive) and max (exclusive) */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /** Returns a random float between min and max */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  getSeed(): number {
    return this.seed;
  }
}

/** Create initial player state */
export function createPlayerState(
  id: string,
  name: string,
  lane: number,
  isBot: boolean,
  skinIndex: number,
  botProfile?: PlayerState['botProfile']
): PlayerState {
  return {
    id,
    name,
    x: lane * PHYSICS.LANE_WIDTH + PHYSICS.LANE_WIDTH / 2,
    y: 0,
    lane,
    forwardSpeed: 0,
    lateralSpeed: 0,
    distanceTraveled: 0,
    isJumping: false,
    jumpTimer: 0,
    stunTimer: 0,
    hasShield: false,
    shieldTimer: 0,
    speedBoostTimer: 0,
    jumpBoostTimer: 0,
    isBot,
    botProfile,
    skinIndex,
    score: 0,
    finished: false,
    finishTime: 0,
    finishPosition: 0,
  };
}

/** Update a single player's physics for one fixed timestep */
export function updatePlayerPhysics(
  player: PlayerState,
  input: InputState,
  segment: TrackSegment,
  dt: number
): void {
  if (player.finished) return;

  // Update timers
  if (player.stunTimer > 0) {
    player.stunTimer -= dt;
    if (player.stunTimer < 0) player.stunTimer = 0;
  }
  if (player.shieldTimer > 0) {
    player.shieldTimer -= dt;
    if (player.shieldTimer <= 0) {
      player.hasShield = false;
      player.shieldTimer = 0;
    }
  }
  if (player.speedBoostTimer > 0) {
    player.speedBoostTimer -= dt;
    if (player.speedBoostTimer < 0) player.speedBoostTimer = 0;
  }
  if (player.jumpBoostTimer > 0) {
    player.jumpBoostTimer -= dt;
    if (player.jumpBoostTimer < 0) player.jumpBoostTimer = 0;
  }

  // No movement while stunned
  if (player.stunTimer > 0) return;

  // Forward acceleration (downhill)
  const slopeBoost = -segment.slope * 50;
  const speedMult = player.speedBoostTimer > 0 ? PHYSICS.SPEED_BOOST_MULT : 1;
  player.forwardSpeed += (PHYSICS.FORWARD_ACCEL + slopeBoost) * dt;
  player.forwardSpeed = Math.min(player.forwardSpeed * speedMult, PHYSICS.MAX_FORWARD_SPEED);
  player.forwardSpeed *= segment.friction;

  // Lateral movement
  const targetLateral = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  if (targetLateral !== 0) {
    player.lateralSpeed += targetLateral * PHYSICS.LATERAL_ACCEL * dt;
    player.lateralSpeed = Math.max(-PHYSICS.LATERAL_SPEED, Math.min(PHYSICS.LATERAL_SPEED, player.lateralSpeed));
  } else {
    // Friction deceleration
    if (player.lateralSpeed > 0) {
      player.lateralSpeed -= PHYSICS.LATERAL_FRICTION * dt;
      if (player.lateralSpeed < 0) player.lateralSpeed = 0;
    } else if (player.lateralSpeed < 0) {
      player.lateralSpeed += PHYSICS.LATERAL_FRICTION * dt;
      if (player.lateralSpeed > 0) player.lateralSpeed = 0;
    }
  }

  // Jump handling
  if (input.jump && !player.isJumping) {
    player.isJumping = true;
    player.jumpTimer = player.jumpBoostTimer > 0
      ? PHYSICS.JUMP_DURATION * PHYSICS.JUMP_BOOST_MULT
      : PHYSICS.JUMP_DURATION;
  }

  if (player.isJumping) {
    player.jumpTimer -= dt;
    if (player.jumpTimer <= 0) {
      player.isJumping = false;
      player.jumpTimer = 0;
      // Landing speed boost
      player.forwardSpeed += PHYSICS.LANDING_BOOST;
    }
  }

  // Update position
  player.x += player.lateralSpeed * dt;
  player.distanceTraveled += player.forwardSpeed * dt;

  // Clamp to slide bounds
  const halfWidth = (segment.lanes * PHYSICS.LANE_WIDTH) / 2;
  const centerX = PHYSICS.SLIDE_WIDTH / 2;
  player.x = Math.max(centerX - halfWidth + 10, Math.min(centerX + halfWidth - 10, player.x));

  // Update lane based on position
  player.lane = Math.floor(player.x / PHYSICS.LANE_WIDTH);
  player.lane = Math.max(0, Math.min(segment.lanes - 1, player.lane));
}

/** Check collision between two players */
export function checkPlayerCollision(a: PlayerState, b: PlayerState): boolean {
  if (a.isJumping || b.isJumping) return false;
  if (a.finished || b.finished) return false;
  const dx = a.x - b.x;
  const dy = a.distanceTraveled - b.distanceTraveled;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < PHYSICS.COLLISION_RADIUS * 2;
}

/** Resolve collision between two players */
export function resolveCollision(a: PlayerState, b: PlayerState): void {
  if (a.hasShield && b.hasShield) return;

  const dx = a.x - b.x;
  const pushDir = dx > 0 ? 1 : -1;

  if (!a.hasShield) {
    a.lateralSpeed += pushDir * PHYSICS.COLLISION_PUSH;
    a.stunTimer = PHYSICS.STUN_DURATION;
  }
  if (!b.hasShield) {
    b.lateralSpeed -= pushDir * PHYSICS.COLLISION_PUSH;
    b.stunTimer = PHYSICS.STUN_DURATION;
  }
}

/** Check if player hits an obstacle */
export function checkObstacleCollision(
  player: PlayerState,
  obstacleX: number,
  obstacleY: number,
  _type: ObstacleType
): boolean {
  if (player.isJumping) return false;
  const dx = player.x - obstacleX;
  const dy = player.distanceTraveled - obstacleY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < PHYSICS.COLLISION_RADIUS * 1.5;
}

/** Apply obstacle effect */
export function applyObstacleEffect(player: PlayerState, type: ObstacleType): void {
  if (player.hasShield) return;
  switch (type) {
    case 'barrel':
      player.forwardSpeed *= 0.5;
      player.stunTimer = PHYSICS.STUN_DURATION * 1.5;
      break;
    case 'ring':
      player.forwardSpeed *= 0.7;
      player.lateralSpeed *= -0.5;
      break;
    case 'bumper':
      player.lateralSpeed += (player.x > PHYSICS.SLIDE_WIDTH / 2 ? 1 : -1) * PHYSICS.COLLISION_PUSH * 1.5;
      player.stunTimer = PHYSICS.STUN_DURATION;
      break;
  }
}

/** Apply powerup effect */
export function applyPowerup(player: PlayerState, type: PowerupType): void {
  switch (type) {
    case 'speed_boost':
      player.speedBoostTimer = PHYSICS.SPEED_BOOST_DURATION;
      break;
    case 'shield':
      player.hasShield = true;
      player.shieldTimer = PHYSICS.SHIELD_DURATION;
      break;
    case 'jump_boost':
      player.jumpBoostTimer = PHYSICS.JUMP_BOOST_DURATION;
      break;
  }
}

/** Calculate score for a finished player */
export function calculateScore(
  position: number,
  totalPlayers: number,
  finishTime: number,
  matchLength: number
): number {
  const positionScore = Math.max(0, (totalPlayers - position + 1) * 100);
  const timeBonus = Math.max(0, Math.floor((matchLength - finishTime) * 10));
  return positionScore + timeBonus;
}

/** Game mode types */
export type GameMode = 'classic' | 'timeTrial' | 'chaos' | 'custom';

/** Quality settings */
export type QualityLevel = 'high' | 'medium' | 'low';

/** Control scheme */
export type ControlScheme = 'buttons' | 'swipe' | 'tilt';

/** Game settings stored in local storage */
export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  controlScheme: ControlScheme;
  quality: QualityLevel;
  botCount: number;
  matchLength: number; // seconds
  tiltEnabled: boolean;
}

/** Default settings */
export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  controlScheme: 'buttons',
  quality: 'medium',
  botCount: 7,
  matchLength: 45,
  tiltEnabled: false,
};

/** Player state during gameplay */
export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  lane: number;
  forwardSpeed: number;
  lateralSpeed: number;
  distanceTraveled: number;
  isJumping: boolean;
  jumpTimer: number;
  stunTimer: number;
  hasShield: boolean;
  shieldTimer: number;
  speedBoostTimer: number;
  jumpBoostTimer: number;
  isBot: boolean;
  botProfile?: BotProfileType;
  skinIndex: number;
  score: number;
  finished: boolean;
  finishTime: number;
  finishPosition: number;
}

/** Bot profile types */
export type BotProfileType = 'casual' | 'aggressive' | 'speedster' | 'trickster' | 'adaptive';

/** Track segment types */
export type SegmentType = 'straight' | 'curve_left' | 'curve_right' | 'ramp' | 'gap' | 'splitter' | 'narrow';

/** Track segment definition */
export interface TrackSegment {
  type: SegmentType;
  length: number;
  lanes: number;
  obstacles: ObstacleData[];
  powerups: PowerupData[];
  friction: number;
  slope: number; // negative = downhill (faster)
}

/** Obstacle types */
export type ObstacleType = 'barrel' | 'ring' | 'bumper';

/** Obstacle placement */
export interface ObstacleData {
  type: ObstacleType;
  lane: number;
  position: number; // 0-1 within segment
  moving?: boolean;
  moveRange?: number;
}

/** Powerup types */
export type PowerupType = 'speed_boost' | 'shield' | 'jump_boost';

/** Powerup placement */
export interface PowerupData {
  type: PowerupType;
  lane: number;
  position: number;
}

/** Replay frame data */
export interface ReplayFrame {
  tick: number;
  inputs: InputState;
}

/** Input state per frame */
export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

/** Full replay data */
export interface ReplayData {
  version: number;
  seed: number;
  mode: GameMode;
  settings: Partial<GameSettings>;
  frames: ReplayFrame[];
  startTime: number;
  playerName: string;
}

/** Replay metadata for listing */
export interface ReplayMeta {
  id: string;
  date: number;
  mode: GameMode;
  score: number;
  position: number;
  duration: number;
}

/** Player stats */
export interface Stats {
  totalRuns: number;
  totalWins: number;
  bestTime: number;
  totalScore: number;
  achievements: string[];
  unlockedSkins: number[];
}

/** Default stats */
export const DEFAULT_STATS: Stats = {
  totalRuns: 0,
  totalWins: 0,
  bestTime: 999999,
  totalScore: 0,
  achievements: [],
  unlockedSkins: [0],
};

/** Achievement definitions */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (stats: Stats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: 'First Place!', description: 'Win your first race', condition: (s) => s.totalWins >= 1 },
  { id: 'ten_runs', name: 'Veteran', description: 'Complete 10 races', condition: (s) => s.totalRuns >= 10 },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Finish under 30 seconds', condition: (s) => s.bestTime < 30 },
  { id: 'winner_streak', name: 'Champion', description: 'Win 5 races', condition: (s) => s.totalWins >= 5 },
  { id: 'high_scorer', name: 'High Scorer', description: 'Accumulate 1000 total score', condition: (s) => s.totalScore >= 1000 },
];

/** Color palette for players */
export const PLAYER_COLORS = [
  0xFF6B6B, // red
  0x4ECDC4, // teal
  0xFFE66D, // yellow
  0x95E1D3, // mint
  0xF38181, // coral
  0xAA96DA, // lavender
  0xFCBF49, // orange
  0x2EC4B6, // turquoise
];

/** Skin names */
export const SKIN_NAMES = [
  'Classic Red',
  'Cool Teal',
  'Sunny Yellow',
  'Fresh Mint',
  'Hot Coral',
  'Royal Lavender',
  'Citrus Orange',
  'Deep Turquoise',
];

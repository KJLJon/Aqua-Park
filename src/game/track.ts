/**
 * Track generation - Modular track segments for water slide courses.
 * Supports prebuilt (Classic) and procedural generation.
 */
import {
  TrackSegment,
  SegmentType,
  ObstacleData,
  PowerupData,
  GameMode,
  GameSettings,
} from './types';
import { SeededRNG } from './engine';

/** Create the Classic prebuilt track that mimics the original game */
export function getClassicTrack(): TrackSegment[] {
  return [
    // Starting straight
    createSegment('straight', 400, 5, 0.98, -0.5, [
      { type: 'barrel', lane: 1, position: 0.5 },
      { type: 'barrel', lane: 3, position: 0.7 },
    ], [
      { type: 'speed_boost', lane: 2, position: 0.3 },
    ]),
    // First curve
    createSegment('curve_left', 300, 5, 0.97, -0.6, [
      { type: 'ring', lane: 0, position: 0.4 },
      { type: 'bumper', lane: 4, position: 0.6, moving: true, moveRange: 30 },
    ], []),
    // Ramp section
    createSegment('ramp', 200, 5, 0.99, -1.0, [], [
      { type: 'jump_boost', lane: 2, position: 0.5 },
    ]),
    // Wide straight
    createSegment('straight', 500, 5, 0.98, -0.4, [
      { type: 'barrel', lane: 0, position: 0.2 },
      { type: 'barrel', lane: 2, position: 0.3 },
      { type: 'barrel', lane: 4, position: 0.4 },
      { type: 'bumper', lane: 1, position: 0.6, moving: true, moveRange: 40 },
      { type: 'ring', lane: 3, position: 0.8 },
    ], [
      { type: 'speed_boost', lane: 1, position: 0.15 },
      { type: 'shield', lane: 3, position: 0.5 },
    ]),
    // Narrow squeeze
    createSegment('narrow', 200, 3, 0.96, -0.7, [
      { type: 'bumper', lane: 1, position: 0.5, moving: true, moveRange: 20 },
    ], [
      { type: 'speed_boost', lane: 0, position: 0.3 },
    ]),
    // Second curve
    createSegment('curve_right', 350, 5, 0.97, -0.5, [
      { type: 'ring', lane: 2, position: 0.3 },
      { type: 'barrel', lane: 4, position: 0.5 },
      { type: 'barrel', lane: 0, position: 0.7 },
    ], [
      { type: 'jump_boost', lane: 2, position: 0.6 },
    ]),
    // Big ramp
    createSegment('ramp', 250, 5, 0.99, -1.2, [], [
      { type: 'speed_boost', lane: 2, position: 0.4 },
    ]),
    // Gap section
    createSegment('gap', 150, 5, 0.95, -0.3, [
      { type: 'ring', lane: 1, position: 0.5 },
      { type: 'ring', lane: 3, position: 0.5 },
    ], []),
    // Final sprint
    createSegment('straight', 600, 5, 0.98, -0.8, [
      { type: 'bumper', lane: 0, position: 0.2, moving: true, moveRange: 50 },
      { type: 'bumper', lane: 4, position: 0.3, moving: true, moveRange: 50 },
      { type: 'barrel', lane: 2, position: 0.5 },
      { type: 'ring', lane: 1, position: 0.7 },
      { type: 'ring', lane: 3, position: 0.7 },
      { type: 'barrel', lane: 2, position: 0.85 },
    ], [
      { type: 'speed_boost', lane: 2, position: 0.1 },
      { type: 'shield', lane: 0, position: 0.6 },
      { type: 'speed_boost', lane: 4, position: 0.9 },
    ]),
    // Splitter
    createSegment('splitter', 300, 5, 0.97, -0.6, [
      { type: 'bumper', lane: 2, position: 0.4 },
    ], [
      { type: 'speed_boost', lane: 0, position: 0.5 },
      { type: 'speed_boost', lane: 4, position: 0.5 },
    ]),
    // Final stretch
    createSegment('straight', 400, 5, 0.99, -1.0, [
      { type: 'barrel', lane: 1, position: 0.3 },
      { type: 'barrel', lane: 3, position: 0.3 },
    ], [
      { type: 'speed_boost', lane: 2, position: 0.5 },
    ]),
  ];
}

/** Create a procedurally generated track */
export function createTrack(rng: SeededRNG, mode: GameMode, settings: GameSettings): TrackSegment[] {
  const segments: TrackSegment[] = [];
  const targetLength = settings.matchLength * 80; // approximate target total length
  let currentLength = 0;

  const segmentTypes: SegmentType[] = ['straight', 'curve_left', 'curve_right', 'ramp', 'narrow', 'gap'];
  if (mode === 'chaos') {
    // Chaos has more variety and obstacles
    segmentTypes.push('splitter', 'gap', 'ramp');
  }

  // Always start with a straight
  const startSeg = createSegment('straight', 300, 5, 0.98, -0.5, [], [
    { type: 'speed_boost', lane: 2, position: 0.5 },
  ]);
  segments.push(startSeg);
  currentLength += 300;

  while (currentLength < targetLength) {
    const type = segmentTypes[rng.nextInt(0, segmentTypes.length)];
    const length = rng.nextInt(150, 500);
    const lanes = type === 'narrow' ? 3 : 5;
    const friction = rng.nextFloat(0.95, 0.99);
    const slope = rng.nextFloat(-1.2, -0.3);

    // Generate obstacles
    const obstacles: ObstacleData[] = [];
    const obsCount = mode === 'chaos' ? rng.nextInt(2, 6) : rng.nextInt(0, 4);
    const obstacleTypes: ObstacleData['type'][] = ['barrel', 'ring', 'bumper'];

    for (let i = 0; i < obsCount; i++) {
      obstacles.push({
        type: obstacleTypes[rng.nextInt(0, obstacleTypes.length)],
        lane: rng.nextInt(0, lanes),
        position: rng.nextFloat(0.1, 0.9),
        moving: mode === 'chaos' ? rng.next() > 0.5 : rng.next() > 0.8,
        moveRange: rng.nextInt(20, 50),
      });
    }

    // Generate powerups
    const powerups: PowerupData[] = [];
    const puCount = rng.nextInt(0, 3);
    const puTypes: PowerupData['type'][] = ['speed_boost', 'shield', 'jump_boost'];

    for (let i = 0; i < puCount; i++) {
      powerups.push({
        type: puTypes[rng.nextInt(0, puTypes.length)],
        lane: rng.nextInt(0, lanes),
        position: rng.nextFloat(0.1, 0.9),
      });
    }

    segments.push(createSegment(type, length, lanes, friction, slope, obstacles, powerups));
    currentLength += length;
  }

  // End with a clear finish straight
  segments.push(createSegment('straight', 200, 5, 0.99, -0.8, [], []));

  return segments;
}

function createSegment(
  type: SegmentType,
  length: number,
  lanes: number,
  friction: number,
  slope: number,
  obstacles: ObstacleData[],
  powerups: PowerupData[]
): TrackSegment {
  return { type, length, lanes, friction, slope, obstacles, powerups };
}

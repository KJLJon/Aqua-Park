/**
 * Replay codec - Encode/decode replay data for URL sharing.
 * Separated from ReplayScene to allow testing without Phaser.
 */
import { ReplayData } from './types';

/** Encode replay data to a compact URL-safe string */
export function encodeReplayToUrl(replay: ReplayData): string {
  const compact = {
    v: replay.version,
    s: replay.seed,
    m: replay.mode,
    f: replay.frames.map(f => ({
      t: f.tick,
      i: (f.inputs.left ? 1 : 0) | (f.inputs.right ? 2 : 0) | (f.inputs.jump ? 4 : 0),
    })),
  };
  const json = JSON.stringify(compact);
  return btoa(json);
}

/** Decode replay data from a URL-safe string */
export function decodeReplayFromUrl(encoded: string): ReplayData | null {
  try {
    const json = atob(encoded);
    const compact = JSON.parse(json);
    return {
      version: compact.v,
      seed: compact.s,
      mode: compact.m,
      settings: {},
      frames: compact.f.map((f: { t: number; i: number }) => ({
        tick: f.t,
        inputs: {
          left: !!(f.i & 1),
          right: !!(f.i & 2),
          jump: !!(f.i & 4),
        },
      })),
      startTime: 0,
      playerName: 'Replay',
    };
  } catch {
    return null;
  }
}

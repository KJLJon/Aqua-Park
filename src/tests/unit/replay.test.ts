/**
 * Unit tests for replay serialization and deserialization.
 */
import { encodeReplayToUrl, decodeReplayFromUrl } from '../../game/replayCodec';
import { ReplayData } from '../../game/types';

describe('Replay Serialization', () => {
  const sampleReplay: ReplayData = {
    version: 1,
    seed: 12345,
    mode: 'classic',
    settings: {},
    frames: [
      { tick: 1, inputs: { left: false, right: false, jump: false } },
      { tick: 2, inputs: { left: true, right: false, jump: false } },
      { tick: 3, inputs: { left: false, right: true, jump: false } },
      { tick: 4, inputs: { left: false, right: false, jump: true } },
      { tick: 5, inputs: { left: true, right: false, jump: true } },
    ],
    startTime: 1700000000000,
    playerName: 'TestPlayer',
  };

  test('encode produces a non-empty string', () => {
    const encoded = encodeReplayToUrl(sampleReplay);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });

  test('decode reverses encode correctly', () => {
    const encoded = encodeReplayToUrl(sampleReplay);
    const decoded = decodeReplayFromUrl(encoded);

    expect(decoded).toBeTruthy();
    expect(decoded!.seed).toBe(12345);
    expect(decoded!.mode).toBe('classic');
    expect(decoded!.frames).toHaveLength(5);
  });

  test('preserves input states through encode/decode', () => {
    const encoded = encodeReplayToUrl(sampleReplay);
    const decoded = decodeReplayFromUrl(encoded)!;

    // Frame 1: no inputs
    expect(decoded.frames[0].inputs.left).toBe(false);
    expect(decoded.frames[0].inputs.right).toBe(false);
    expect(decoded.frames[0].inputs.jump).toBe(false);

    // Frame 2: left only
    expect(decoded.frames[1].inputs.left).toBe(true);
    expect(decoded.frames[1].inputs.right).toBe(false);
    expect(decoded.frames[1].inputs.jump).toBe(false);

    // Frame 3: right only
    expect(decoded.frames[2].inputs.left).toBe(false);
    expect(decoded.frames[2].inputs.right).toBe(true);
    expect(decoded.frames[2].inputs.jump).toBe(false);

    // Frame 4: jump only
    expect(decoded.frames[3].inputs.left).toBe(false);
    expect(decoded.frames[3].inputs.right).toBe(false);
    expect(decoded.frames[3].inputs.jump).toBe(true);

    // Frame 5: left + jump
    expect(decoded.frames[4].inputs.left).toBe(true);
    expect(decoded.frames[4].inputs.right).toBe(false);
    expect(decoded.frames[4].inputs.jump).toBe(true);
  });

  test('decoding invalid data returns null', () => {
    expect(decodeReplayFromUrl('not-valid-base64!!!')).toBeNull();
    expect(decodeReplayFromUrl('')).toBeNull();
  });

  test('encoded replay is reasonably compact', () => {
    // Create a large replay
    const bigReplay: ReplayData = {
      ...sampleReplay,
      frames: Array.from({ length: 2700 }, (_, i) => ({
        tick: i,
        inputs: {
          left: i % 3 === 0,
          right: i % 5 === 0,
          jump: i % 20 === 0,
        },
      })),
    };

    const encoded = encodeReplayToUrl(bigReplay);
    // 45 seconds at 60fps = 2700 frames, should be under 100KB
    expect(encoded.length).toBeLessThan(100000);
  });
});

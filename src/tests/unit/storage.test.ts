/**
 * Unit tests for storage abstraction layer.
 * Uses a mock localStorage for testing.
 */
import { StorageManager } from '../../storage/storage';
import { DEFAULT_STATS, DEFAULT_SETTINGS, GameSettings, Stats } from '../../game/types';

// Mock localStorage backed by a plain object
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem(key: string): string | null { return key in store ? store[key] : null; },
  setItem(key: string, value: string): void { store[key] = value; },
  removeItem(key: string): void { delete store[key]; },
  clear(): void { Object.keys(store).forEach(k => delete store[k]); },
  get length(): number { return Object.keys(store).length; },
  key(i: number): string | null { return Object.keys(store)[i] ?? null; },
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
});

describe('StorageManager - Stats', () => {
  test('loadStats returns defaults when no data', async () => {
    const stats = await StorageManager.loadStats();
    expect(stats).toEqual(DEFAULT_STATS);
  });

  test('saveStats and loadStats round-trip', async () => {
    const stats: Stats = {
      ...DEFAULT_STATS,
      totalRuns: 5,
      totalWins: 2,
      bestTime: 25.5,
    };
    await StorageManager.saveStats(stats);
    const loaded = await StorageManager.loadStats();
    expect(loaded.totalRuns).toBe(5);
    expect(loaded.totalWins).toBe(2);
    expect(loaded.bestTime).toBe(25.5);
  });

  test('loadStats handles corrupted data gracefully', async () => {
    store['aquapark_stats'] = 'not-json';
    const stats = await StorageManager.loadStats();
    expect(stats).toEqual(DEFAULT_STATS);
  });
});

describe('StorageManager - Settings', () => {
  test('loadSettings returns defaults when no data', async () => {
    const settings = await StorageManager.loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  test('saveSettings and loadSettings round-trip', async () => {
    const settings: GameSettings = {
      ...DEFAULT_SETTINGS,
      masterVolume: 0.5,
      muted: true,
      controlScheme: 'swipe',
      quality: 'low',
      botCount: 3,
    };
    await StorageManager.saveSettings(settings);
    const loaded = await StorageManager.loadSettings();
    expect(loaded.masterVolume).toBe(0.5);
    expect(loaded.muted).toBe(true);
    expect(loaded.controlScheme).toBe('swipe');
    expect(loaded.quality).toBe('low');
    expect(loaded.botCount).toBe(3);
  });
});

describe('StorageManager - Replays', () => {
  test('listReplays returns empty when no replays', async () => {
    const replays = await StorageManager.listReplays();
    expect(replays).toEqual([]);
  });

  test('saveReplay and loadReplay round-trip', async () => {
    const replay = {
      version: 1,
      seed: 42,
      mode: 'classic' as const,
      settings: {},
      frames: [
        { tick: 1, inputs: { left: false, right: false, jump: false } },
        { tick: 2, inputs: { left: true, right: false, jump: false } },
      ],
      startTime: Date.now(),
      playerName: 'Test',
    };

    await StorageManager.saveReplay('test_1', replay);
    const loaded = await StorageManager.loadReplay('test_1');
    expect(loaded).toBeTruthy();
    expect(loaded!.seed).toBe(42);
    expect(loaded!.frames).toHaveLength(2);
  });

  test('listReplays returns saved replays', async () => {
    const replay = {
      version: 1,
      seed: 42,
      mode: 'classic' as const,
      settings: {},
      frames: [],
      startTime: Date.now(),
      playerName: 'Test',
    };

    await StorageManager.saveReplay('r1', replay);
    await StorageManager.saveReplay('r2', replay);
    const list = await StorageManager.listReplays();
    expect(list.length).toBe(2);
  });

  test('deleteReplay removes replay', async () => {
    const replay = {
      version: 1,
      seed: 42,
      mode: 'classic' as const,
      settings: {},
      frames: [],
      startTime: Date.now(),
      playerName: 'Test',
    };

    await StorageManager.saveReplay('r1', replay);
    await StorageManager.deleteReplay('r1');
    const loaded = await StorageManager.loadReplay('r1');
    expect(loaded).toBeNull();
  });

  test('loadReplay returns null for missing replay', async () => {
    const loaded = await StorageManager.loadReplay('nonexistent');
    expect(loaded).toBeNull();
  });
});

describe('StorageManager - Utility', () => {
  test('clearAll removes all game data', async () => {
    await StorageManager.saveStats({ ...DEFAULT_STATS, totalRuns: 1 });
    await StorageManager.saveSettings(DEFAULT_SETTINGS);
    await StorageManager.clearAll();
    const stats = await StorageManager.loadStats();
    expect(stats).toEqual(DEFAULT_STATS);
  });

  test('getStorageUsage returns approximate byte count', async () => {
    await StorageManager.saveStats({ ...DEFAULT_STATS, totalRuns: 100 });
    const usage = await StorageManager.getStorageUsage();
    expect(usage).toBeGreaterThan(0);
  });
});

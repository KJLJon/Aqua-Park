/**
 * Storage abstraction layer using localStorage with JSON serialization.
 * API designed to be easily swappable for IndexedDB or remote storage.
 */
import {
  Stats,
  DEFAULT_STATS,
  GameSettings,
  DEFAULT_SETTINGS,
  ReplayData,
  ReplayMeta,
} from '../game/types';

const KEYS = {
  STATS: 'aquapark_stats',
  SETTINGS: 'aquapark_settings',
  REPLAYS_INDEX: 'aquapark_replays_index',
  REPLAY_PREFIX: 'aquapark_replay_',
};

/**
 * StorageManager - Provides async API for game data persistence.
 * Uses localStorage internally but exposes Promise-based API
 * for future migration to IndexedDB or remote storage.
 */
export class StorageManager {
  /** Save player stats */
  static async saveStats(stats: Stats): Promise<void> {
    try {
      localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
    } catch {
      // Storage full or unavailable
    }
  }

  /** Load player stats */
  static async loadStats(): Promise<Stats> {
    try {
      const data = localStorage.getItem(KEYS.STATS);
      if (data) {
        return { ...DEFAULT_STATS, ...JSON.parse(data) };
      }
    } catch {
      // Corrupted data
    }
    return { ...DEFAULT_STATS };
  }

  /** Save game settings */
  static async saveSettings(settings: GameSettings): Promise<void> {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Storage full or unavailable
    }
  }

  /** Load game settings */
  static async loadSettings(): Promise<GameSettings> {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // Corrupted data
    }
    return { ...DEFAULT_SETTINGS };
  }

  /** Save a replay */
  static async saveReplay(id: string, data: ReplayData): Promise<void> {
    try {
      // Save replay data
      localStorage.setItem(KEYS.REPLAY_PREFIX + id, JSON.stringify(data));

      // Update index
      const index = await this.listReplays();
      const meta: ReplayMeta = {
        id,
        date: Date.now(),
        mode: data.mode,
        score: 0,
        position: 0,
        duration: data.frames.length / 60,
      };
      index.unshift(meta);

      // Keep only last 20 replays
      if (index.length > 20) {
        const removed = index.splice(20);
        removed.forEach(r => {
          try {
            localStorage.removeItem(KEYS.REPLAY_PREFIX + r.id);
          } catch {
            // Ignore
          }
        });
      }

      localStorage.setItem(KEYS.REPLAYS_INDEX, JSON.stringify(index));
    } catch {
      // Storage full
    }
  }

  /** Load a replay by ID */
  static async loadReplay(id: string): Promise<ReplayData | null> {
    try {
      const data = localStorage.getItem(KEYS.REPLAY_PREFIX + id);
      if (data) {
        return JSON.parse(data) as ReplayData;
      }
    } catch {
      // Corrupted data
    }
    return null;
  }

  /** List all saved replay metadata */
  static async listReplays(): Promise<ReplayMeta[]> {
    try {
      const data = localStorage.getItem(KEYS.REPLAYS_INDEX);
      if (data) {
        return JSON.parse(data) as ReplayMeta[];
      }
    } catch {
      // Corrupted data
    }
    return [];
  }

  /** Delete a replay */
  static async deleteReplay(id: string): Promise<void> {
    try {
      localStorage.removeItem(KEYS.REPLAY_PREFIX + id);
      const index = await this.listReplays();
      const filtered = index.filter(r => r.id !== id);
      localStorage.setItem(KEYS.REPLAYS_INDEX, JSON.stringify(filtered));
    } catch {
      // Ignore
    }
  }

  /** Clear all stored data */
  static async clearAll(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('aquapark_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }

  /** Get approximate storage usage in bytes */
  static async getStorageUsage(): Promise<number> {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('aquapark_')) {
          const val = localStorage.getItem(key);
          if (val) total += val.length * 2; // UTF-16
        }
      }
      return total;
    } catch {
      return 0;
    }
  }
}

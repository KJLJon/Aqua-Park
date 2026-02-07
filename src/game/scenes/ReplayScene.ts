import Phaser from 'phaser';
import { ReplayData, ReplayMeta } from '../types';
import { StorageManager } from '../../storage/storage';
import { encodeReplayToUrl, decodeReplayFromUrl } from '../replayCodec';

// Re-export for backward compat
export { encodeReplayToUrl, decodeReplayFromUrl } from '../replayCodec';

/**
 * ReplayScene - Lists saved replays and allows playback.
 * Can also encode/decode replay data for sharing via URL.
 */
export class ReplayScene extends Phaser.Scene {
  private action: 'list' | 'play' = 'list';
  private replayId?: string;

  constructor() {
    super({ key: 'ReplayScene' });
  }

  init(data: { action?: 'list' | 'play'; replayId?: string }): void {
    this.action = data.action || 'list';
    this.replayId = data.replayId;
  }

  async create(): Promise<void> {
    if (this.action === 'play' && this.replayId) {
      await this.playReplay(this.replayId);
      return;
    }

    await this.showReplayList();
  }

  private async showReplayList(): Promise<void> {
    const { width, height } = this.cameras.main;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x003566, 0x003566, 0x0077B6, 0x00B4D8, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    this.add.text(width / 2, 40, 'REPLAYS', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
      stroke: '#003566',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const replays = await StorageManager.listReplays();

    if (replays.length === 0) {
      this.add.text(width / 2, height / 2, 'No replays saved yet.\nPlay some races first!', {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#CAF0F8',
        align: 'center',
      }).setOrigin(0.5);
    } else {
      let y = 100;
      replays.slice(0, 10).forEach((meta: ReplayMeta) => {
        this.createReplayRow(30, y, meta, width);
        y += 60;
      });
    }

    // Check for replay in URL hash
    this.checkUrlReplay();

    // Back button
    this.add.text(width / 2, height - 60, 'Back to Menu', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#CAF0F8',
    }).setOrigin(0.5);

    this.add.zone(width / 2, height - 60, 200, 40).setInteractive().on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private createReplayRow(x: number, y: number, meta: ReplayMeta, width: number): void {
    const row = this.add.graphics();
    row.fillStyle(0x003566, 0.6);
    row.fillRoundedRect(x, y, width - 60, 50, 8);

    // Date
    const date = new Date(meta.date);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    this.add.text(x + 10, y + 8, dateStr, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#90E0EF',
    });

    // Mode and position
    this.add.text(x + 10, y + 28, `${meta.mode} - #${meta.position}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
    });

    // Score
    this.add.text(x + 180, y + 18, `Score: ${meta.score}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#FFD700',
    });

    // Play button
    const playBtn = this.add.graphics();
    playBtn.fillStyle(0x00B4D8, 0.9);
    playBtn.fillRoundedRect(width - 110, y + 8, 60, 34, 8);
    this.add.text(width - 80, y + 25, 'Play', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.add.zone(width - 80, y + 25, 60, 34).setInteractive().on('pointerdown', () => {
      this.playReplay(meta.id);
    });

    // Share button
    const shareBtn = this.add.graphics();
    shareBtn.fillStyle(0x003566, 0.9);
    shareBtn.fillRoundedRect(width - 170, y + 8, 52, 34, 8);
    this.add.text(width - 144, y + 25, 'Share', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#CAF0F8',
    }).setOrigin(0.5);

    this.add.zone(width - 144, y + 25, 52, 34).setInteractive().on('pointerdown', async () => {
      await this.shareReplay(meta.id);
    });
  }

  private async playReplay(replayId: string): Promise<void> {
    const replay = await StorageManager.loadReplay(replayId);
    if (replay) {
      this.scene.start('GameScene', {
        mode: replay.mode,
        settings: replay.settings,
        replay,
      });
    }
  }

  private async shareReplay(replayId: string): Promise<void> {
    const replay = await StorageManager.loadReplay(replayId);
    if (!replay) return;

    // Encode replay as compressed base64 for URL
    const encoded = encodeReplayToUrl(replay);
    const url = `${window.location.origin}${window.location.pathname}#replay=${encoded}`;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      this.showToast('Replay link copied!');
    } else {
      this.showToast('Share not available');
    }
  }

  private checkUrlReplay(): void {
    const hash = window.location.hash;
    if (hash.startsWith('#replay=')) {
      const encoded = hash.substring(8);
      try {
        const replay = decodeReplayFromUrl(encoded);
        if (replay) {
          this.scene.start('GameScene', {
            mode: replay.mode,
            settings: replay.settings,
            replay,
          });
        }
      } catch {
        // Invalid replay data
      }
    }
  }

  private showToast(message: string): void {
    const { width, height } = this.cameras.main;
    const toast = this.add.text(width / 2, height - 120, message, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
      backgroundColor: '#003566',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: height - 140,
      duration: 2000,
      delay: 1000,
      onComplete: () => toast.destroy(),
    });
  }
}

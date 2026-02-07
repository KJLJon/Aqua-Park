import Phaser from 'phaser';
import { GameMode, DEFAULT_SETTINGS, GameSettings } from '../types';
import { StorageManager } from '../../storage/storage';

/**
 * MenuScene - Main menu with mode selection, settings, and replay viewer access.
 */
export class MenuScene extends Phaser.Scene {
  private settings!: GameSettings;

  constructor() {
    super({ key: 'MenuScene' });
  }

  async create(): Promise<void> {
    this.settings = await StorageManager.loadSettings();
    const { width, height } = this.cameras.main;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0077B6, 0x0077B6, 0x00B4D8, 0x90E0EF, 1);
    bg.fillRect(0, 0, width, height);

    // Animated water at bottom
    this.createWaterAnimation(width, height);

    // Title
    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#0077B6',
      strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#003566', blur: 8, fill: true },
    };
    const title = this.add.text(width / 2, 80, 'AQUA PARK', titleStyle).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: 90,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(width / 2, 130, 'Water Slide Racing', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#CAF0F8',
    }).setOrigin(0.5);

    // Mode buttons
    const modes: { label: string; mode: GameMode; y: number }[] = [
      { label: 'Classic Race', mode: 'classic', y: 240 },
      { label: 'Time Trial', mode: 'timeTrial', y: 320 },
      { label: 'Chaos Mode', mode: 'chaos', y: 400 },
      { label: 'Custom Game', mode: 'custom', y: 480 },
    ];

    modes.forEach(({ label, mode, y }) => {
      this.createMenuButton(width / 2, y, label, () => {
        this.scene.start('GameScene', { mode, settings: this.settings });
      });
    });

    // Bottom buttons
    this.createSmallButton(width / 2 - 80, 600, 'Settings', () => {
      this.scene.start('SettingsScene');
    });

    this.createSmallButton(width / 2 + 80, 600, 'Replays', () => {
      this.scene.start('ReplayScene', { action: 'list' });
    });

    // Stats display
    const stats = await StorageManager.loadStats();
    this.add.text(width / 2, 700, `Races: ${stats.totalRuns}  Wins: ${stats.totalWins}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#CAF0F8',
    }).setOrigin(0.5);

    // Version
    this.add.text(width / 2, height - 20, 'v1.0.0', {
      fontSize: '10px',
      color: '#CAF0F8',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);
  }

  private createMenuButton(x: number, y: number, label: string, callback: () => void): void {
    const btn = this.add.graphics();
    btn.fillStyle(0x0077B6, 0.9);
    btn.fillRoundedRect(x - 120, y - 25, 240, 50, 15);
    btn.lineStyle(2, 0xCAF0F8, 1);
    btn.strokeRoundedRect(x - 120, y - 25, 240, 50, 15);

    const text = this.add.text(x, y, label, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    const hitArea = this.add.zone(x, y, 240, 50).setInteractive();
    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: [btn, text],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: callback,
      });
    });
    hitArea.on('pointerover', () => {
      btn.clear();
      btn.fillStyle(0x0096C7, 0.95);
      btn.fillRoundedRect(x - 120, y - 25, 240, 50, 15);
      btn.lineStyle(2, 0xFFFFFF, 1);
      btn.strokeRoundedRect(x - 120, y - 25, 240, 50, 15);
    });
    hitArea.on('pointerout', () => {
      btn.clear();
      btn.fillStyle(0x0077B6, 0.9);
      btn.fillRoundedRect(x - 120, y - 25, 240, 50, 15);
      btn.lineStyle(2, 0xCAF0F8, 1);
      btn.strokeRoundedRect(x - 120, y - 25, 240, 50, 15);
    });
  }

  private createSmallButton(x: number, y: number, label: string, callback: () => void): void {
    const btn = this.add.graphics();
    btn.fillStyle(0x003566, 0.8);
    btn.fillRoundedRect(x - 65, y - 20, 130, 40, 10);

    this.add.text(x, y, label, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#CAF0F8',
    }).setOrigin(0.5);

    this.add.zone(x, y, 130, 40).setInteractive().on('pointerdown', callback);
  }

  private createWaterAnimation(width: number, height: number): void {
    const waterY = height - 100;
    for (let i = 0; i < 3; i++) {
      const wave = this.add.graphics();
      wave.fillStyle(0x90E0EF, 0.3 + i * 0.15);
      wave.fillEllipse(width / 2, waterY + i * 20, width + 40, 80);
      this.tweens.add({
        targets: wave,
        x: 10 + i * 5,
        duration: 2000 + i * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}

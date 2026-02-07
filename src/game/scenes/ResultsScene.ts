import Phaser from 'phaser';
import { PlayerState, GameMode, PLAYER_COLORS } from '../types';
import { AudioManager } from '../audio';

/**
 * ResultsScene - Shows race results with positions, scores, and options.
 */
export class ResultsScene extends Phaser.Scene {
  private players: PlayerState[] = [];
  private mode!: GameMode;
  private elapsedTime = 0;

  constructor() {
    super({ key: 'ResultsScene' });
  }

  init(data: { players: PlayerState[]; mode: GameMode; elapsedTime: number }): void {
    this.players = data.players || [];
    this.mode = data.mode || 'classic';
    this.elapsedTime = data.elapsedTime || 0;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x003566, 0x003566, 0x0077B6, 0x00B4D8, 1);
    bg.fillRect(0, 0, width, height);

    // Confetti
    this.createConfetti(width, height);

    // Title
    const humanPlayer = this.players.find(p => !p.isBot);
    const posText = humanPlayer ? this.getPositionText(humanPlayer.finishPosition) : '';

    this.add.text(width / 2, 60, 'RACE COMPLETE!', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#FFD700',
      stroke: '#003566',
      strokeThickness: 4,
    }).setOrigin(0.5);

    if (humanPlayer) {
      this.add.text(width / 2, 110, `You finished ${posText}!`, {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: humanPlayer.finishPosition === 1 ? '#FFD700' : '#FFFFFF',
      }).setOrigin(0.5);
    }

    // Leaderboard
    const startY = 170;
    const rowHeight = 50;
    this.players.slice(0, 8).forEach((p, i) => {
      const y = startY + i * rowHeight;
      const isHuman = !p.isBot;

      // Row background
      const row = this.add.graphics();
      row.fillStyle(isHuman ? 0xFFD700 : 0x003566, isHuman ? 0.3 : 0.5);
      row.fillRoundedRect(30, y - 15, width - 60, 40, 8);

      // Position
      this.add.text(50, y, `#${p.finishPosition}`, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      // Color dot
      const dot = this.add.graphics();
      dot.fillStyle(PLAYER_COLORS[p.skinIndex] || 0xFFFFFF, 1);
      dot.fillCircle(95, y, 8);

      // Name
      this.add.text(115, y, p.name, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: isHuman ? '#FFE66D' : '#CAF0F8',
      }).setOrigin(0, 0.5);

      // Time
      this.add.text(250, y, this.formatTime(p.finishTime), {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#90E0EF',
      }).setOrigin(0, 0.5);

      // Score
      this.add.text(340, y, `${p.score}`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#FFD700',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);
    });

    // Summary
    const summaryY = startY + Math.min(this.players.length, 8) * rowHeight + 20;
    this.add.text(width / 2, summaryY, `Mode: ${this.mode} | Time: ${this.formatTime(this.elapsedTime)}`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#90E0EF',
    }).setOrigin(0.5);

    // Buttons
    this.createButton(width / 2, summaryY + 60, 'Play Again', () => {
      this.scene.start('GameScene', { mode: this.mode });
    });

    this.createButton(width / 2, summaryY + 120, 'Main Menu', () => {
      this.scene.start('MenuScene');
    });

    // Audio
    AudioManager.getInstance().playSfx('win');
  }

  private createButton(x: number, y: number, label: string, callback: () => void): void {
    const btn = this.add.graphics();
    btn.fillStyle(0x0077B6, 0.9);
    btn.fillRoundedRect(x - 100, y - 22, 200, 44, 12);
    btn.lineStyle(2, 0xCAF0F8, 1);
    btn.strokeRoundedRect(x - 100, y - 22, 200, 44, 12);

    this.add.text(x, y, label, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.add.zone(x, y, 200, 44).setInteractive().on('pointerdown', callback);
  }

  private createConfetti(width: number, height: number): void {
    const colors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x95E1D3, 0xF38181, 0xAA96DA];
    for (let i = 0; i < 40; i++) {
      const confetti = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(-50, -10),
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(4, 8),
        Phaser.Utils.Array.GetRandom(colors)
      );
      this.tweens.add({
        targets: confetti,
        y: height + 20,
        x: confetti.x + Phaser.Math.Between(-50, 50),
        angle: Phaser.Math.Between(0, 360),
        duration: Phaser.Math.Between(2000, 4000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private getPositionText(pos: number): string {
    if (pos === 1) return '1st';
    if (pos === 2) return '2nd';
    if (pos === 3) return '3rd';
    return `${pos}th`;
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}

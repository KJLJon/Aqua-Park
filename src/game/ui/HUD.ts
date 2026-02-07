import Phaser from 'phaser';
import { PlayerState } from '../types';

/**
 * HUD - Heads-Up Display showing position, time, powerups, and mini-map.
 */
export class HUD {
  private scene: Phaser.Scene;
  private player: PlayerState;
  private positionText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private powerupIcon?: Phaser.GameObjects.Sprite;
  private progressBar!: Phaser.GameObjects.Graphics;
  private container!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, player: PlayerState) {
    this.scene = scene;
    this.player = player;
    this.create();
  }

  private create(): void {
    const { width } = this.scene.cameras.main;
    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(900);

    // Semi-transparent top bar
    const topBar = this.scene.add.graphics();
    topBar.fillStyle(0x000000, 0.4);
    topBar.fillRect(0, 0, width, 50);
    this.container.add(topBar);

    // Position
    this.positionText = this.scene.add.text(15, 12, '#-', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    this.container.add(this.positionText);

    // Time
    this.timeText = this.scene.add.text(width / 2, 12, '0:00', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0);
    this.container.add(this.timeText);

    // Speed indicator
    this.speedText = this.scene.add.text(width - 15, 12, '0', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#90E0EF',
    }).setOrigin(1, 0);
    this.container.add(this.speedText);

    // Progress bar at very top
    this.progressBar = this.scene.add.graphics();
    this.container.add(this.progressBar);
  }

  update(elapsedTime: number, _finishCount: number, totalTrackLength: number): void {
    const { width } = this.scene.cameras.main;

    // Position (find player's current rank among all players)
    // We approximate by checking distanceTraveled
    this.positionText.setText(`#${this.player.finishPosition || '-'}`);

    // Time
    const m = Math.floor(elapsedTime / 60);
    const s = Math.floor(elapsedTime % 60);
    this.timeText.setText(`${m}:${s.toString().padStart(2, '0')}`);

    // Speed
    const speed = Math.floor(this.player.forwardSpeed);
    this.speedText.setText(`${speed} km/h`);

    // Progress bar
    const progress = Math.min(1, this.player.distanceTraveled / totalTrackLength);
    this.progressBar.clear();
    this.progressBar.fillStyle(0x003566, 0.8);
    this.progressBar.fillRect(0, 0, width, 4);
    this.progressBar.fillStyle(0x00B4D8, 1);
    this.progressBar.fillRect(0, 0, width * progress, 4);

    // Active powerup indicator
    if (this.player.speedBoostTimer > 0) {
      this.speedText.setColor('#FFD700');
    } else if (this.player.hasShield) {
      this.speedText.setColor('#4FC3F7');
    } else {
      this.speedText.setColor('#90E0EF');
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}

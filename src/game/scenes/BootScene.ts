import Phaser from 'phaser';

/**
 * BootScene - Generates placeholder assets procedurally and loads them.
 * Shows a loading progress bar.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create progress bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    const { width, height } = this.cameras.main;

    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRoundedRect(width / 2 - 120, height / 2 - 15, 240, 30, 10);

    const loadingText = this.add.text(width / 2, height / 2 - 40, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00b4d8, 1);
      progressBar.fillRoundedRect(width / 2 - 115, height / 2 - 10, 230 * value, 20, 8);

      // Update DOM progress bar
      const domBar = document.getElementById('progress-bar');
      const domText = document.getElementById('progress-text');
      if (domBar) domBar.style.width = `${Math.floor(value * 100)}%`;
      if (domText) domText.textContent = `${Math.floor(value * 100)}%`;
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      // Hide DOM progress
      const domProgress = document.getElementById('install-progress');
      if (domProgress) domProgress.classList.add('hidden');
    });

    // Generate all placeholder textures procedurally
    this.generatePlaceholderAssets();
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  private generatePlaceholderAssets(): void {
    const g = this.add.graphics();
    g.setVisible(false);

    // Player character (circle with face)
    this.generatePlayerTextures(g);

    // Slide tile
    g.clear();
    g.fillStyle(0x00b4d8, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x0096c7, 1);
    g.fillRect(0, 0, 64, 4);
    g.fillRect(0, 60, 64, 4);
    g.lineStyle(1, 0x48cae4, 0.5);
    for (let i = 0; i < 64; i += 16) {
      g.lineBetween(i, 0, i, 64);
    }
    g.generateTexture('slide_tile', 64, 64);

    // Water tile
    g.clear();
    g.fillStyle(0x90e0ef, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0xade8f4, 0.6);
    for (let i = 0; i < 5; i++) {
      g.fillEllipse(10 + i * 12, 32, 8, 4);
    }
    g.generateTexture('water_tile', 64, 64);

    // Ramp
    g.clear();
    g.fillStyle(0xfca311, 1);
    g.fillTriangle(0, 64, 64, 64, 32, 0);
    g.generateTexture('ramp', 64, 64);

    // Obstacles
    // Barrel
    g.clear();
    g.fillStyle(0x8B4513, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0x654321, 1);
    g.fillRect(4, 14, 24, 4);
    g.generateTexture('barrel', 32, 32);

    // Ring
    g.clear();
    g.lineStyle(4, 0xFF6B6B, 1);
    g.strokeCircle(16, 16, 12);
    g.generateTexture('ring', 32, 32);

    // Bumper
    g.clear();
    g.fillStyle(0xFF4500, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xFF6347, 1);
    g.fillCircle(16, 16, 8);
    g.generateTexture('bumper', 32, 32);

    // Powerups
    g.clear();
    g.fillStyle(0xFFD700, 1);
    // Draw a star shape manually
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      g.lineTo(16 + Math.cos(outerAngle) * 14, 16 + Math.sin(outerAngle) * 14);
      g.lineTo(16 + Math.cos(innerAngle) * 7, 16 + Math.sin(innerAngle) * 7);
    }
    g.closePath();
    g.fillPath();
    g.generateTexture('powerup_speed', 32, 32);

    g.clear();
    g.fillStyle(0x4FC3F7, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xB3E5FC, 0.5);
    g.fillCircle(16, 16, 10);
    g.generateTexture('powerup_shield', 32, 32);

    g.clear();
    g.fillStyle(0x76FF03, 1);
    g.fillTriangle(16, 2, 2, 30, 30, 30);
    g.generateTexture('powerup_jump', 32, 32);

    // Pool (finish area)
    g.clear();
    g.fillStyle(0x0077B6, 1);
    g.fillRoundedRect(0, 0, 256, 128, 20);
    g.fillStyle(0x00B4D8, 0.7);
    g.fillRoundedRect(10, 10, 236, 108, 15);
    g.generateTexture('pool', 256, 128);

    // Splash particle
    g.clear();
    g.fillStyle(0xADE8F4, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('splash_particle', 8, 8);

    // Speed line particle
    g.clear();
    g.fillStyle(0xFFFFFF, 0.6);
    g.fillRect(0, 0, 2, 16);
    g.generateTexture('speed_line', 2, 16);

    // Confetti particle
    g.clear();
    g.fillStyle(0xFF6B6B, 1);
    g.fillRect(0, 0, 6, 6);
    g.generateTexture('confetti', 6, 6);

    // UI elements
    // Button backgrounds
    g.clear();
    g.fillStyle(0x0077B6, 1);
    g.fillRoundedRect(0, 0, 80, 80, 15);
    g.fillStyle(0x00B4D8, 1);
    g.fillRoundedRect(4, 4, 72, 72, 12);
    g.generateTexture('btn_base', 80, 80);

    // Arrow left
    g.clear();
    g.fillStyle(0xFFFFFF, 1);
    g.fillTriangle(50, 10, 50, 60, 15, 35);
    g.generateTexture('arrow_left', 64, 64);

    // Arrow right
    g.clear();
    g.fillStyle(0xFFFFFF, 1);
    g.fillTriangle(14, 10, 14, 60, 49, 35);
    g.generateTexture('arrow_right', 64, 64);

    // Jump icon
    g.clear();
    g.fillStyle(0xFFFFFF, 1);
    g.fillTriangle(32, 8, 8, 56, 56, 56);
    g.generateTexture('jump_icon', 64, 64);

    // Parallax background layers
    g.clear();
    // Simple sky
    g.fillStyle(0x87CEEB, 1);
    g.fillRect(0, 0, 390, 256);
    g.fillStyle(0xFFFFFF, 0.4);
    g.fillEllipse(80, 60, 60, 20);
    g.fillEllipse(200, 40, 80, 25);
    g.fillEllipse(300, 80, 50, 15);
    g.generateTexture('bg_sky', 390, 256);

    // Mountains
    g.clear();
    g.fillStyle(0x2D6A4F, 1);
    g.fillTriangle(0, 200, 100, 50, 200, 200);
    g.fillTriangle(120, 200, 250, 30, 390, 200);
    g.fillStyle(0x40916C, 1);
    g.fillTriangle(50, 200, 180, 80, 320, 200);
    g.generateTexture('bg_mountains', 390, 200);

    // Side rail
    g.clear();
    g.fillStyle(0x0096C7, 1);
    g.fillRect(0, 0, 16, 64);
    g.fillStyle(0x48CAE4, 1);
    g.fillRect(4, 0, 8, 64);
    g.generateTexture('side_rail', 16, 64);

    // Shield effect
    g.clear();
    g.lineStyle(3, 0x4FC3F7, 0.7);
    g.strokeCircle(20, 20, 18);
    g.generateTexture('shield_effect', 40, 40);

    // Mini-map frame
    g.clear();
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(0, 0, 60, 120, 5);
    g.generateTexture('minimap_bg', 60, 120);

    g.destroy();
  }

  private generatePlayerTextures(g: Phaser.GameObjects.Graphics): void {
    const colors = [
      0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x95E1D3,
      0xF38181, 0xAA96DA, 0xFCBF49, 0x2EC4B6,
    ];

    colors.forEach((color, i) => {
      g.clear();
      // Body (on a tube/float)
      g.fillStyle(color, 1);
      g.fillCircle(20, 16, 12); // head
      g.fillStyle(color, 0.8);
      g.fillEllipse(20, 32, 20, 12); // body
      // Tube
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillEllipse(20, 36, 28, 8);
      g.lineStyle(2, color, 1);
      g.strokeEllipse(20, 36, 28, 8);
      // Face
      g.fillStyle(0x000000, 1);
      g.fillCircle(16, 14, 2); // left eye
      g.fillCircle(24, 14, 2); // right eye
      g.lineStyle(1, 0x000000, 1);
      g.beginPath();
      g.arc(20, 18, 4, 0, Math.PI, false);
      g.strokePath(); // smile
      g.generateTexture(`player_${i}`, 40, 48);
    });
  }
}

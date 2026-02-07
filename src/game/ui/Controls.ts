import Phaser from 'phaser';
import { ControlScheme, InputState } from '../types';

/**
 * Controls - Handles touch/keyboard input for the player.
 * Supports on-screen buttons, swipe gestures, and device tilt.
 */
export class Controls {
  private scene: Phaser.Scene;
  private scheme: ControlScheme;
  private tiltEnabled: boolean;
  private input: InputState = { left: false, right: false, jump: false };

  // Swipe tracking
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeThreshold = 30;
  private swipeDeadzone = 10;

  // Tilt
  private tiltBaseline = 0;
  private tiltSensitivity = 15; // degrees

  // On-screen buttons
  private leftBtn?: Phaser.GameObjects.Container;
  private rightBtn?: Phaser.GameObjects.Container;
  private jumpBtn?: Phaser.GameObjects.Container;

  // Keyboard
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, scheme: ControlScheme, tiltEnabled: boolean) {
    this.scene = scene;
    this.scheme = scheme;
    this.tiltEnabled = tiltEnabled;

    this.setupKeyboard();

    if (scheme === 'buttons') {
      this.setupButtons();
    } else if (scheme === 'swipe') {
      this.setupSwipe();
    }

    if (tiltEnabled) {
      this.setupTilt();
    }
  }

  getInput(): InputState {
    // Keyboard always works as fallback
    if (this.cursors) {
      if (this.cursors.left.isDown) this.input.left = true;
      if (this.cursors.right.isDown) this.input.right = true;
      if (this.cursors.left.isUp && this.scheme !== 'tilt') {
        if (this.scheme !== 'buttons') this.input.left = false;
      }
      if (this.cursors.right.isUp && this.scheme !== 'tilt') {
        if (this.scheme !== 'buttons') this.input.right = false;
      }
    }
    if (this.spaceKey?.isDown) this.input.jump = true;
    if (this.spaceKey?.isUp && this.scheme !== 'buttons') this.input.jump = false;

    return { ...this.input };
  }

  private setupKeyboard(): void {
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  private setupButtons(): void {
    const { width, height } = this.scene.cameras.main;
    const btnSize = 70;
    const margin = 20;
    const bottomY = height - margin - btnSize / 2;

    // Left button
    this.leftBtn = this.createButton(margin + btnSize / 2, bottomY, btnSize, 'arrow_left');
    this.leftBtn.setScrollFactor(0).setDepth(950);

    const leftZone = this.scene.add.zone(margin + btnSize / 2, bottomY, btnSize, btnSize)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(951);

    leftZone.on('pointerdown', () => { this.input.left = true; });
    leftZone.on('pointerup', () => { this.input.left = false; });
    leftZone.on('pointerout', () => { this.input.left = false; });

    // Right button
    this.rightBtn = this.createButton(margin + btnSize * 1.8, bottomY, btnSize, 'arrow_right');
    this.rightBtn.setScrollFactor(0).setDepth(950);

    const rightZone = this.scene.add.zone(margin + btnSize * 1.8, bottomY, btnSize, btnSize)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(951);

    rightZone.on('pointerdown', () => { this.input.right = true; });
    rightZone.on('pointerup', () => { this.input.right = false; });
    rightZone.on('pointerout', () => { this.input.right = false; });

    // Jump button
    this.jumpBtn = this.createButton(width - margin - btnSize / 2, bottomY, btnSize, 'jump_icon');
    this.jumpBtn.setScrollFactor(0).setDepth(950);

    const jumpZone = this.scene.add.zone(width - margin - btnSize / 2, bottomY, btnSize, btnSize)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(951);

    jumpZone.on('pointerdown', () => { this.input.jump = true; });
    jumpZone.on('pointerup', () => { this.input.jump = false; });
    jumpZone.on('pointerout', () => { this.input.jump = false; });
  }

  private createButton(x: number, y: number, size: number, iconKey: string): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    // Button background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0077B6, 0.6);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, 15);
    bg.lineStyle(2, 0xCAF0F8, 0.5);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 15);
    container.add(bg);

    // Icon
    const icon = this.scene.add.sprite(0, 0, iconKey);
    icon.setDisplaySize(size * 0.5, size * 0.5);
    container.add(icon);

    return container;
  }

  private setupSwipe(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const dx = pointer.x - this.swipeStartX;
      const dy = pointer.y - this.swipeStartY;

      // Horizontal swipe for steering
      if (Math.abs(dx) > this.swipeDeadzone) {
        this.input.left = dx < -this.swipeThreshold;
        this.input.right = dx > this.swipeThreshold;
      } else {
        this.input.left = false;
        this.input.right = false;
      }

      // Vertical swipe for jump
      if (dy < -this.swipeThreshold * 1.5) {
        this.input.jump = true;
      }
    });

    this.scene.input.on('pointerup', () => {
      this.input.left = false;
      this.input.right = false;
      this.input.jump = false;
    });

    // Also add a jump button for swipe mode
    const { width, height } = this.scene.cameras.main;
    const jumpBtn = this.createButton(width - 50, height - 60, 60, 'jump_icon');
    jumpBtn.setScrollFactor(0).setDepth(950);
    const jumpZone = this.scene.add.zone(width - 50, height - 60, 60, 60)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(951);
    jumpZone.on('pointerdown', () => { this.input.jump = true; });
    jumpZone.on('pointerup', () => { this.input.jump = false; });
  }

  private setupTilt(): void {
    if ('DeviceOrientationEvent' in window) {
      // Request permission on iOS 13+
      const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
      if (typeof requestPermission === 'function') {
        requestPermission().then((state: string) => {
          if (state === 'granted') {
            this.addTiltListener();
          }
        }).catch(() => {
          // Permission denied
        });
      } else {
        this.addTiltListener();
      }
    }
  }

  private addTiltListener(): void {
    let calibrated = false;
    window.addEventListener('deviceorientation', (event: DeviceOrientationEvent) => {
      if (event.gamma === null) return;
      if (!calibrated) {
        this.tiltBaseline = event.gamma;
        calibrated = true;
      }
      const tilt = event.gamma - this.tiltBaseline;
      if (tilt < -this.tiltSensitivity) {
        this.input.left = true;
        this.input.right = false;
      } else if (tilt > this.tiltSensitivity) {
        this.input.left = false;
        this.input.right = true;
      } else {
        this.input.left = false;
        this.input.right = false;
      }
    });
  }

  destroy(): void {
    // Clean up listeners
    this.leftBtn?.destroy();
    this.rightBtn?.destroy();
    this.jumpBtn?.destroy();
  }
}

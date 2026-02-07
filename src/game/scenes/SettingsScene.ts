import Phaser from 'phaser';
import { GameSettings, DEFAULT_SETTINGS, ControlScheme, QualityLevel } from '../types';
import { StorageManager } from '../../storage/storage';
import { AudioManager } from '../audio';

/**
 * SettingsScene - Configurable settings for audio, controls, quality, and gameplay.
 */
export class SettingsScene extends Phaser.Scene {
  private settings!: GameSettings;
  private sliders: Map<string, { bar: Phaser.GameObjects.Graphics; handle: Phaser.GameObjects.Graphics; value: number }> = new Map();

  constructor() {
    super({ key: 'SettingsScene' });
  }

  async create(): Promise<void> {
    this.settings = await StorageManager.loadSettings();
    const { width, height } = this.cameras.main;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x003566, 0x003566, 0x0077B6, 0x00B4D8, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    this.add.text(width / 2, 40, 'SETTINGS', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
      stroke: '#003566',
      strokeThickness: 4,
    }).setOrigin(0.5);

    let y = 100;
    const sectionGap = 30;

    // Audio section
    this.addSectionTitle(width / 2, y, 'Audio');
    y += 35;
    this.addSlider(40, y, 'Master Volume', this.settings.masterVolume, (v) => {
      this.settings.masterVolume = v;
    });
    y += 50;
    this.addSlider(40, y, 'Music', this.settings.musicVolume, (v) => {
      this.settings.musicVolume = v;
    });
    y += 50;
    this.addSlider(40, y, 'SFX', this.settings.sfxVolume, (v) => {
      this.settings.sfxVolume = v;
    });
    y += 40;
    this.addToggle(40, y, 'Mute All', this.settings.muted, (v) => {
      this.settings.muted = v;
    });

    y += sectionGap + 30;

    // Controls section
    this.addSectionTitle(width / 2, y, 'Controls');
    y += 35;
    this.addOptionSelector(40, y, 'Scheme', ['buttons', 'swipe', 'tilt'] as ControlScheme[],
      this.settings.controlScheme, (v: ControlScheme) => {
        this.settings.controlScheme = v;
      });
    y += 40;
    this.addToggle(40, y, 'Tilt Steering', this.settings.tiltEnabled, (v) => {
      this.settings.tiltEnabled = v;
    });

    y += sectionGap + 30;

    // Graphics section
    this.addSectionTitle(width / 2, y, 'Graphics');
    y += 35;
    this.addOptionSelector(40, y, 'Quality', ['low', 'medium', 'high'] as QualityLevel[],
      this.settings.quality, (v: QualityLevel) => {
        this.settings.quality = v;
      });

    y += sectionGap + 30;

    // Gameplay section
    this.addSectionTitle(width / 2, y, 'Gameplay');
    y += 35;
    this.addSlider(40, y, `Bots: ${this.settings.botCount}`, this.settings.botCount / 15, (v) => {
      this.settings.botCount = Math.max(1, Math.round(v * 15));
    });
    y += 50;
    this.addSlider(40, y, `Time: ${this.settings.matchLength}s`, this.settings.matchLength / 120, (v) => {
      this.settings.matchLength = Math.max(15, Math.round(v * 120));
    });

    // Back and Reset buttons
    this.addButton(width / 2 - 80, height - 80, 'Save & Back', async () => {
      await StorageManager.saveSettings(this.settings);
      AudioManager.getInstance().applySettings(this.settings);
      this.scene.start('MenuScene');
    });

    this.addButton(width / 2 + 80, height - 80, 'Reset', async () => {
      this.settings = { ...DEFAULT_SETTINGS };
      await StorageManager.saveSettings(this.settings);
      this.scene.restart();
    });
  }

  private addSectionTitle(x: number, y: number, text: string): void {
    this.add.text(x, y, text, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const line = this.add.graphics();
    line.lineStyle(1, 0xFFD700, 0.5);
    line.lineBetween(40, y + 12, this.cameras.main.width - 40, y + 12);
  }

  private addSlider(x: number, y: number, label: string, value: number, onChange: (v: number) => void): void {
    const width = this.cameras.main.width - 80;

    this.add.text(x, y - 10, label, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#CAF0F8',
    });

    const bar = this.add.graphics();
    bar.fillStyle(0x003566, 1);
    bar.fillRoundedRect(x, y + 8, width, 8, 4);
    bar.fillStyle(0x00B4D8, 1);
    bar.fillRoundedRect(x, y + 8, width * value, 8, 4);

    const handleX = x + width * value;
    const handle = this.add.graphics();
    handle.fillStyle(0xFFFFFF, 1);
    handle.fillCircle(0, 0, 10);
    handle.setPosition(handleX, y + 12);

    const hitZone = this.add.zone(x + width / 2, y + 12, width + 20, 30).setInteractive();
    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const newVal = Phaser.Math.Clamp((pointer.x - x) / width, 0, 1);
      handle.setPosition(x + width * newVal, y + 12);
      bar.clear();
      bar.fillStyle(0x003566, 1);
      bar.fillRoundedRect(x, y + 8, width, 8, 4);
      bar.fillStyle(0x00B4D8, 1);
      bar.fillRoundedRect(x, y + 8, width * newVal, 8, 4);
      onChange(newVal);
    });
    hitZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const newVal = Phaser.Math.Clamp((pointer.x - x) / width, 0, 1);
      handle.setPosition(x + width * newVal, y + 12);
      bar.clear();
      bar.fillStyle(0x003566, 1);
      bar.fillRoundedRect(x, y + 8, width, 8, 4);
      bar.fillStyle(0x00B4D8, 1);
      bar.fillRoundedRect(x, y + 8, width * newVal, 8, 4);
      onChange(newVal);
    });
  }

  private addToggle(x: number, y: number, label: string, value: boolean, onChange: (v: boolean) => void): void {
    this.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#CAF0F8',
    });

    const toggleBg = this.add.graphics();
    const toggleHandle = this.add.graphics();
    const drawToggle = (on: boolean) => {
      toggleBg.clear();
      toggleBg.fillStyle(on ? 0x00B4D8 : 0x003566, 1);
      toggleBg.fillRoundedRect(280, y - 2, 50, 24, 12);
      toggleHandle.clear();
      toggleHandle.fillStyle(0xFFFFFF, 1);
      toggleHandle.fillCircle(on ? 318 : 292, y + 10, 10);
    };
    drawToggle(value);

    let current = value;
    this.add.zone(305, y + 10, 50, 24).setInteractive().on('pointerdown', () => {
      current = !current;
      drawToggle(current);
      onChange(current);
    });
  }

  private addOptionSelector<T extends string>(
    x: number, y: number, label: string, options: T[], current: T, onChange: (v: T) => void
  ): void {
    this.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#CAF0F8',
    });

    let selected = options.indexOf(current);
    const btnWidth = 80;
    const startX = 140;

    const buttons: Phaser.GameObjects.Graphics[] = [];
    const texts: Phaser.GameObjects.Text[] = [];

    options.forEach((opt, i) => {
      const bx = startX + i * (btnWidth + 10);
      const btn = this.add.graphics();
      const txt = this.add.text(bx + btnWidth / 2, y + 2, opt, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#FFFFFF',
      }).setOrigin(0.5);
      buttons.push(btn);
      texts.push(txt);

      this.add.zone(bx + btnWidth / 2, y + 2, btnWidth, 24).setInteractive().on('pointerdown', () => {
        selected = i;
        onChange(options[i]);
        updateButtons();
      });
    });

    const updateButtons = () => {
      buttons.forEach((btn, i) => {
        btn.clear();
        const bx = startX + i * (btnWidth + 10);
        btn.fillStyle(i === selected ? 0x00B4D8 : 0x003566, 1);
        btn.fillRoundedRect(bx, y - 10, btnWidth, 24, 8);
      });
    };
    updateButtons();
  }

  private addButton(x: number, y: number, label: string, callback: () => void): void {
    const btn = this.add.graphics();
    btn.fillStyle(0x0077B6, 0.9);
    btn.fillRoundedRect(x - 65, y - 18, 130, 36, 10);

    this.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.add.zone(x, y, 130, 36).setInteractive().on('pointerdown', callback);
  }
}

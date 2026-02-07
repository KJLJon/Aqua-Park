import Phaser from 'phaser';
import {
  GameMode,
  GameSettings,
  PlayerState,
  InputState,
  TrackSegment,
  ReplayFrame,
  ReplayData,
  DEFAULT_SETTINGS,
  PLAYER_COLORS,
  ObstacleData,
  PowerupData,
} from '../types';
import {
  PHYSICS,
  SeededRNG,
  createPlayerState,
  updatePlayerPhysics,
  checkPlayerCollision,
  resolveCollision,
  applyPowerup,
  applyObstacleEffect,
  calculateScore,
} from '../engine';
import { BotController } from '../../ai/botController';
import { createTrack, getClassicTrack } from '../track';
import { HUD } from '../ui/HUD';
import { Controls } from '../ui/Controls';
import { AudioManager } from '../audio';
import { StorageManager } from '../../storage/storage';

/**
 * GameScene - Main gameplay scene with physics, rendering, AI, and input handling.
 */
export class GameScene extends Phaser.Scene {
  // Game state
  private mode!: GameMode;
  private settings!: GameSettings;
  private rng!: SeededRNG;
  private seed!: number;
  private players: PlayerState[] = [];
  private track: TrackSegment[] = [];
  private totalTrackLength = 0;
  private elapsedTime = 0;
  private tickCount = 0;
  private gameOver = false;
  private finishCount = 0;
  private countdownTimer = 3;
  private isCountingDown = true;

  // Input
  private playerInput: InputState = { left: false, right: false, jump: false };
  private controls!: Controls;
  private hud!: HUD;

  // AI
  private botControllers: Map<string, BotController> = new Map();

  // Replay
  private replayFrames: ReplayFrame[] = [];
  private isReplay = false;
  private replayData?: ReplayData;
  private replayTick = 0;

  // Rendering
  private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private obstacleSprites: Phaser.GameObjects.Sprite[] = [];
  private powerupSprites: Phaser.GameObjects.Sprite[] = [];
  private slideGraphics!: Phaser.GameObjects.Graphics;
  private splashEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private speedLineEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private cameraTarget = 0;

  // Parallax
  private bgSky!: Phaser.GameObjects.TileSprite;
  private bgMountains!: Phaser.GameObjects.TileSprite;

  // Audio
  private audioManager!: AudioManager;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { mode?: GameMode; settings?: GameSettings; replay?: ReplayData }): void {
    this.mode = data.mode || 'classic';
    this.settings = data.settings || DEFAULT_SETTINGS;
    this.isReplay = !!data.replay;
    this.replayData = data.replay;
    this.players = [];
    this.botControllers.clear();
    this.playerSprites.clear();
    this.obstacleSprites = [];
    this.powerupSprites = [];
    this.replayFrames = [];
    this.elapsedTime = 0;
    this.tickCount = 0;
    this.gameOver = false;
    this.finishCount = 0;
    this.replayTick = 0;
    this.countdownTimer = 3;
    this.isCountingDown = true;
    this.playerInput = { left: false, right: false, jump: false };
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Seed
    this.seed = this.isReplay && this.replayData
      ? this.replayData.seed
      : Date.now();
    this.rng = new SeededRNG(this.seed);

    // Generate track
    if (this.mode === 'classic' || (this.isReplay && this.replayData?.mode === 'classic')) {
      this.track = getClassicTrack();
    } else {
      this.track = createTrack(this.rng, this.mode, this.settings);
    }
    this.totalTrackLength = this.track.reduce((sum, seg) => sum + seg.length, 0);

    // Create parallax backgrounds
    this.bgSky = this.add.tileSprite(0, 0, width, 256, 'bg_sky').setOrigin(0, 0).setScrollFactor(0);
    this.bgMountains = this.add.tileSprite(0, 200, width, 200, 'bg_mountains').setOrigin(0, 0).setScrollFactor(0);

    // Create slide graphics
    this.slideGraphics = this.add.graphics();
    this.drawTrack();

    // Create players
    this.createPlayers();

    // Create obstacle and powerup sprites
    this.createTrackObjects();

    // Create player sprites
    this.players.forEach(p => this.createPlayerSprite(p));

    // Particle effects
    this.createParticleEffects();

    // HUD and controls
    this.hud = new HUD(this, this.players.find(p => !p.isBot)!);
    if (!this.isReplay) {
      this.controls = new Controls(this, this.settings.controlScheme, this.settings.tiltEnabled);
    }

    // Audio
    this.audioManager = AudioManager.getInstance();
    this.audioManager.applySettings(this.settings);

    // Camera setup
    this.cameras.main.setBackgroundColor(0x87CEEB);

    // Start countdown
    this.showCountdown();
  }

  update(time: number, delta: number): void {
    if (this.isCountingDown || this.gameOver) return;

    const dt = PHYSICS.FIXED_DT;
    this.elapsedTime += dt;
    this.tickCount++;

    // Get player input
    if (!this.isReplay) {
      this.playerInput = this.controls.getInput();
      this.replayFrames.push({
        tick: this.tickCount,
        inputs: { ...this.playerInput },
      });
    } else if (this.replayData) {
      // Replay playback
      const frame = this.replayData.frames[this.replayTick];
      if (frame) {
        this.playerInput = frame.inputs;
        this.replayTick++;
      }
    }

    // Get current segment for each player
    const getSegment = (distance: number): TrackSegment => {
      let acc = 0;
      for (const seg of this.track) {
        acc += seg.length;
        if (distance < acc) return seg;
      }
      return this.track[this.track.length - 1];
    };

    // Update player physics
    const humanPlayer = this.players.find(p => !p.isBot)!;
    const segment = getSegment(humanPlayer.distanceTraveled);
    updatePlayerPhysics(humanPlayer, this.playerInput, segment, dt);

    // Update bots
    this.players.filter(p => p.isBot && !p.finished).forEach(bot => {
      const controller = this.botControllers.get(bot.id);
      if (controller) {
        const botInput = controller.update(bot, this.players, getSegment(bot.distanceTraveled), this.rng);
        updatePlayerPhysics(bot, botInput, getSegment(bot.distanceTraveled), dt);
      }
    });

    // Check collisions between players
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        if (checkPlayerCollision(this.players[i], this.players[j])) {
          resolveCollision(this.players[i], this.players[j]);
          this.audioManager.playSfx('collision');
          // Camera shake on collision if involves human player
          if (!this.players[i].isBot || !this.players[j].isBot) {
            this.cameras.main.shake(100, 0.005);
          }
        }
      }
    }

    // Check obstacle and powerup collisions
    this.checkTrackObjectCollisions();

    // Check finish
    this.players.forEach(p => {
      if (!p.finished && p.distanceTraveled >= this.totalTrackLength) {
        this.finishCount++;
        p.finished = true;
        p.finishTime = this.elapsedTime;
        p.finishPosition = this.finishCount;
        p.score = calculateScore(this.finishCount, this.players.length, this.elapsedTime, this.settings.matchLength);
        if (!p.isBot) {
          this.audioManager.playSfx('splash');
        }
      }
    });

    // Check time limit or all finished
    if (this.elapsedTime >= this.settings.matchLength || this.players.every(p => p.finished)) {
      // Finish any remaining players
      this.players.forEach(p => {
        if (!p.finished) {
          this.finishCount++;
          p.finished = true;
          p.finishTime = this.elapsedTime;
          p.finishPosition = this.finishCount;
          p.score = calculateScore(this.finishCount, this.players.length, this.elapsedTime, this.settings.matchLength);
        }
      });
      this.endGame();
      return;
    }

    // Update rendering
    this.updateRendering(humanPlayer);
    this.hud.update(this.elapsedTime, this.finishCount, this.totalTrackLength);
  }

  private createPlayers(): void {
    const botCount = this.settings.botCount;
    const totalLanes = this.track[0]?.lanes || 5;

    // Human player
    const humanPlayer = createPlayerState('player', 'You', Math.floor(totalLanes / 2), false, 0);
    this.players.push(humanPlayer);

    // Bot players
    const profiles: PlayerState['botProfile'][] = ['casual', 'aggressive', 'speedster', 'trickster', 'adaptive'];
    for (let i = 0; i < botCount; i++) {
      const lane = i % totalLanes;
      const profile = profiles[i % profiles.length];
      const bot = createPlayerState(
        `bot_${i}`,
        `Bot ${i + 1}`,
        lane,
        true,
        (i + 1) % 8,
        profile
      );
      this.players.push(bot);

      // Create bot controller
      const controller = new BotController(profile!, this.rng);
      this.botControllers.set(bot.id, controller);
    }
  }

  private createPlayerSprite(player: PlayerState): void {
    const container = this.add.container(player.x, 0);
    const sprite = this.add.sprite(0, 0, `player_${player.skinIndex}`);
    sprite.setScale(0.8);
    container.add(sprite);

    // Name tag
    const nameTag = this.add.text(0, -30, player.name, {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: player.isBot ? '#FFFFFF' : '#FFE66D',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(nameTag);

    this.playerSprites.set(player.id, container);
  }

  private drawTrack(): void {
    const g = this.slideGraphics;
    g.clear();

    let yOffset = 200; // start position
    const centerX = this.cameras.main.width / 2;

    this.track.forEach((seg) => {
      const laneWidth = seg.lanes * PHYSICS.LANE_WIDTH;

      // Slide body
      g.fillStyle(0x00B4D8, 1);
      g.fillRect(centerX - laneWidth / 2, yOffset, laneWidth, seg.length);

      // Lane lines
      g.lineStyle(1, 0x48CAE4, 0.3);
      for (let l = 1; l < seg.lanes; l++) {
        const lx = centerX - laneWidth / 2 + l * PHYSICS.LANE_WIDTH;
        g.lineBetween(lx, yOffset, lx, yOffset + seg.length);
      }

      // Side rails
      g.fillStyle(0x0096C7, 1);
      g.fillRect(centerX - laneWidth / 2 - 8, yOffset, 8, seg.length);
      g.fillRect(centerX + laneWidth / 2, yOffset, 8, seg.length);

      // Segment type indicators
      if (seg.type === 'ramp') {
        g.fillStyle(0xFCA311, 0.4);
        g.fillTriangle(
          centerX - laneWidth / 4, yOffset + seg.length,
          centerX + laneWidth / 4, yOffset + seg.length,
          centerX, yOffset
        );
      } else if (seg.type === 'narrow') {
        g.fillStyle(0xFF6B6B, 0.2);
        g.fillRect(centerX - laneWidth / 2, yOffset, laneWidth, seg.length);
      }

      yOffset += seg.length;
    });

    // Finish pool
    g.fillStyle(0x0077B6, 1);
    g.fillRoundedRect(centerX - 100, yOffset, 200, 80, 20);
    g.fillStyle(0x00B4D8, 0.7);
    g.fillRoundedRect(centerX - 90, yOffset + 10, 180, 60, 15);
    g.lineStyle(3, 0xFFD700, 1);
    g.strokeRoundedRect(centerX - 100, yOffset, 200, 80, 20);

    // FINISH text
    this.add.text(centerX, yOffset + 40, 'FINISH', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#FFD700',
      stroke: '#003566',
      strokeThickness: 3,
    }).setOrigin(0.5);
  }

  private createTrackObjects(): void {
    let yOffset = 200;
    const centerX = this.cameras.main.width / 2;

    this.track.forEach((seg) => {
      const laneWidth = seg.lanes * PHYSICS.LANE_WIDTH;
      const baseX = centerX - laneWidth / 2;

      // Obstacles
      seg.obstacles.forEach((obs: ObstacleData) => {
        const ox = baseX + obs.lane * PHYSICS.LANE_WIDTH + PHYSICS.LANE_WIDTH / 2;
        const oy = yOffset + obs.position * seg.length;
        const sprite = this.add.sprite(ox, oy, obs.type);
        sprite.setData('type', obs.type);
        sprite.setData('worldY', oy);
        this.obstacleSprites.push(sprite);

        if (obs.moving) {
          this.tweens.add({
            targets: sprite,
            x: ox + (obs.moveRange || 30),
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      });

      // Powerups
      seg.powerups.forEach((pu: PowerupData) => {
        const px = baseX + pu.lane * PHYSICS.LANE_WIDTH + PHYSICS.LANE_WIDTH / 2;
        const py = yOffset + pu.position * seg.length;
        const texKey = `powerup_${pu.type === 'speed_boost' ? 'speed' : pu.type === 'shield' ? 'shield' : 'jump'}`;
        const sprite = this.add.sprite(px, py, texKey);
        sprite.setData('type', pu.type);
        sprite.setData('worldY', py);
        sprite.setData('collected', false);
        this.powerupSprites.push(sprite);

        // Bobbing animation
        this.tweens.add({
          targets: sprite,
          y: py - 5,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });

      yOffset += seg.length;
    });
  }

  private checkTrackObjectCollisions(): void {
    const humanPlayer = this.players.find(p => !p.isBot)!;
    const camY = this.cameras.main.scrollY;
    const viewRange = this.cameras.main.height;

    // Obstacles
    this.obstacleSprites.forEach(sprite => {
      if (!sprite.visible) return;
      const worldY = sprite.getData('worldY') as number;
      // Only check nearby obstacles
      if (Math.abs(worldY - (humanPlayer.distanceTraveled + 200)) > viewRange) return;

      this.players.forEach(p => {
        if (p.finished || p.isJumping) return;
        const playerScreenY = 200 + p.distanceTraveled;
        const dy = Math.abs(playerScreenY - worldY);
        const dx = Math.abs(p.x + this.cameras.main.width / 2 - this.track[0].lanes * PHYSICS.LANE_WIDTH / 2 - sprite.x);
        if (dy < 20 && dx < 20) {
          applyObstacleEffect(p, sprite.getData('type'));
          sprite.setVisible(false);
          if (!p.isBot) this.audioManager.playSfx('collision');
        }
      });
    });

    // Powerups
    this.powerupSprites.forEach(sprite => {
      if (sprite.getData('collected')) return;
      const worldY = sprite.getData('worldY') as number;
      if (Math.abs(worldY - (humanPlayer.distanceTraveled + 200)) > viewRange) return;

      this.players.forEach(p => {
        if (p.finished || p.isJumping) return;
        const playerScreenY = 200 + p.distanceTraveled;
        const dy = Math.abs(playerScreenY - worldY);
        const dx = Math.abs(p.x + this.cameras.main.width / 2 - this.track[0].lanes * PHYSICS.LANE_WIDTH / 2 - sprite.x);
        if (dy < 25 && dx < 25) {
          applyPowerup(p, sprite.getData('type'));
          sprite.setData('collected', true);
          sprite.setVisible(false);
          if (!p.isBot) this.audioManager.playSfx('powerup');
        }
      });
    });
  }

  private createParticleEffects(): void {
    // Splash particles
    this.splashEmitter = this.add.particles(0, 0, 'splash_particle', {
      speed: { min: 20, max: 80 },
      angle: { min: 240, max: 300 },
      lifespan: 400,
      gravityY: 200,
      scale: { start: 0.8, end: 0 },
      frequency: -1,
      quantity: 5,
    });

    // Speed lines
    this.speedLineEmitter = this.add.particles(0, 0, 'speed_line', {
      speed: { min: 100, max: 200 },
      angle: { min: 85, max: 95 },
      lifespan: 300,
      scale: { start: 1, end: 0.2 },
      alpha: { start: 0.5, end: 0 },
      frequency: -1,
      quantity: 3,
    });
  }

  private updateRendering(humanPlayer: PlayerState): void {
    const { width, height } = this.cameras.main;

    // Camera follows player (scrolling down the slide)
    this.cameraTarget = humanPlayer.distanceTraveled;
    const camY = this.cameraTarget - height * 0.6;
    this.cameras.main.scrollY = Phaser.Math.Linear(
      this.cameras.main.scrollY,
      camY,
      0.1
    );

    // Parallax
    this.bgSky.tilePositionY = this.cameras.main.scrollY * 0.1;
    this.bgMountains.tilePositionY = this.cameras.main.scrollY * 0.3;
    this.bgSky.y = this.cameras.main.scrollY;
    this.bgMountains.y = this.cameras.main.scrollY + 200;

    // Update player sprite positions
    const centerX = width / 2;
    const baseX = centerX - (this.track[0]?.lanes || 5) * PHYSICS.LANE_WIDTH / 2;

    this.players.forEach(p => {
      const container = this.playerSprites.get(p.id);
      if (!container) return;

      const screenX = baseX + p.x;
      const screenY = 200 + p.distanceTraveled;
      container.setPosition(screenX, screenY);

      // Jump effect
      if (p.isJumping) {
        container.setScale(1.1);
        container.y -= 15;
      } else {
        container.setScale(1);
      }

      // Stun effect
      if (p.stunTimer > 0) {
        container.setAlpha(0.5 + Math.sin(this.elapsedTime * 20) * 0.3);
      } else {
        container.setAlpha(1);
      }

      // Shield effect
      if (p.hasShield) {
        // Blue tint
        const sprite = container.list[0] as Phaser.GameObjects.Sprite;
        if (sprite) sprite.setTint(0x4FC3F7);
      } else {
        const sprite = container.list[0] as Phaser.GameObjects.Sprite;
        if (sprite) sprite.clearTint();
      }

      // Speed boost visual
      if (p.speedBoostTimer > 0 && !p.isBot) {
        if (this.speedLineEmitter) {
          this.speedLineEmitter.emitParticleAt(screenX, screenY + 20, 2);
        }
      }

      // Depth sorting (further down slide = rendered on top)
      container.setDepth(p.distanceTraveled);
    });

    // Splash effects for fast players
    if (humanPlayer.forwardSpeed > PHYSICS.MAX_FORWARD_SPEED * 0.7 && this.splashEmitter) {
      const hp = this.playerSprites.get('player');
      if (hp) {
        this.splashEmitter.emitParticleAt(hp.x, hp.y + 15, 2);
      }
    }
  }

  private showCountdown(): void {
    const { width, height } = this.cameras.main;
    const countText = this.add.text(width / 2, height / 2 - 50, '3', {
      fontSize: '72px',
      fontFamily: 'Arial',
      color: '#FFD700',
      stroke: '#003566',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    let count = 3;
    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        count--;
        if (count > 0) {
          countText.setText(count.toString());
          this.tweens.add({
            targets: countText,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 200,
            yoyo: true,
          });
        } else if (count === 0) {
          countText.setText('GO!');
          countText.setColor('#76FF03');
          this.tweens.add({
            targets: countText,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 500,
            onComplete: () => {
              countText.destroy();
              this.isCountingDown = false;
              this.audioManager.playMusic();
            },
          });
        }
      },
    });
  }

  private async endGame(): Promise<void> {
    this.gameOver = true;
    this.audioManager.stopMusic();
    this.audioManager.playSfx('win');

    // Save replay
    if (!this.isReplay) {
      const replayData: ReplayData = {
        version: 1,
        seed: this.seed,
        mode: this.mode,
        settings: this.settings,
        frames: this.replayFrames,
        startTime: Date.now(),
        playerName: 'You',
      };

      const human = this.players.find(p => !p.isBot)!;
      const replayId = `replay_${Date.now()}`;
      await StorageManager.saveReplay(replayId, replayData);

      // Update stats
      const stats = await StorageManager.loadStats();
      stats.totalRuns++;
      if (human.finishPosition === 1) stats.totalWins++;
      if (human.finishTime < stats.bestTime) stats.bestTime = human.finishTime;
      stats.totalScore += human.score;
      await StorageManager.saveStats(stats);
    }

    // Sort players by position
    const sorted = [...this.players].sort((a, b) => a.finishPosition - b.finishPosition);

    // Transition to results
    this.time.delayedCall(1000, () => {
      this.scene.start('ResultsScene', {
        players: sorted,
        mode: this.mode,
        elapsedTime: this.elapsedTime,
      });
    });
  }

  shutdown(): void {
    if (this.controls) this.controls.destroy();
    this.audioManager.stopMusic();
  }
}

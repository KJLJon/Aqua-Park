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
import { Controls } from '../ui/Controls';
import { AudioManager } from '../audio';
import { StorageManager } from '../../storage/storage';

// Pseudo-3D projection constants
const CAMERA_HEIGHT = 450;    // How high the camera is above the track
const CAMERA_DEPTH = 200;     // Field depth (controls perspective intensity)
const DRAW_DISTANCE = 200;    // How many segments ahead to draw
const SEGMENT_LENGTH = 30;    // World units per render segment
const ROAD_WIDTH = 1200;      // Track width in world units
const TOTAL_LANES = 5;

/** A single render-segment of the track for pseudo-3D projection */
interface RenderSegment {
  worldZ: number;      // distance down the track
  screenX: number;     // projected screen X center
  screenY: number;     // projected screen Y
  screenW: number;     // projected half-width
  scale: number;       // perspective scale factor
  curve: number;       // horizontal curvature offset
  slope: number;       // vertical slope
  color1: number;      // alternating color
  color2: number;      // rail color
  clip: number;        // clip Y for segment below
  segmentIndex: number; // which TrackSegment this belongs to
  segFraction: number;  // position 0-1 within that segment
}

/** Obstacle/powerup to render in the 3D scene */
interface WorldObject {
  distance: number;     // world distance down track
  laneOffset: number;   // -1 to 1 (lateral position)
  type: string;
  collected: boolean;
  obstacleType?: string;
  powerupType?: string;
}

/**
 * GameScene - Main gameplay with pseudo-3D rendering.
 * Uses an outrun-style perspective projection for 3D-like visuals.
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
  private isCountingDown = true;

  // Render segments (flattened for projection)
  private renderSegs: RenderSegment[] = [];
  private worldObjects: WorldObject[] = [];

  // Input
  private playerInput: InputState = { left: false, right: false, jump: false };
  private controls!: Controls;

  // AI
  private botControllers: Map<string, BotController> = new Map();

  // Replay
  private replayFrames: ReplayFrame[] = [];
  private isReplay = false;
  private replayData?: ReplayData;
  private replayTick = 0;

  // Rendering
  private gfx!: Phaser.GameObjects.Graphics;
  private hudContainer!: Phaser.GameObjects.Container;
  private posText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private powerupText!: Phaser.GameObjects.Text;

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
    this.replayFrames = [];
    this.elapsedTime = 0;
    this.tickCount = 0;
    this.gameOver = false;
    this.finishCount = 0;
    this.replayTick = 0;
    this.isCountingDown = true;
    this.playerInput = { left: false, right: false, jump: false };
    this.renderSegs = [];
    this.worldObjects = [];
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

    // Build render segments
    this.buildRenderSegments();

    // Build world objects (obstacles + powerups)
    this.buildWorldObjects();

    // Create players
    this.createPlayers();

    // Main graphics object for pseudo-3D rendering
    this.gfx = this.add.graphics();

    // HUD (drawn on top, scroll-independent)
    this.createHUD(width);

    // Controls
    if (!this.isReplay) {
      this.controls = new Controls(this, this.settings.controlScheme, this.settings.tiltEnabled);
    }

    // Audio
    this.audioManager = AudioManager.getInstance();
    this.audioManager.applySettings(this.settings);

    // Camera
    this.cameras.main.setBackgroundColor(0x87CEEB);

    // Countdown
    this.showCountdown();
  }

  update(_time: number, _delta: number): void {
    if (this.isCountingDown || this.gameOver) return;

    const dt = PHYSICS.FIXED_DT;
    this.elapsedTime += dt;
    this.tickCount++;

    // Get input
    if (!this.isReplay) {
      this.playerInput = this.controls.getInput();
      this.replayFrames.push({
        tick: this.tickCount,
        inputs: { ...this.playerInput },
      });
    } else if (this.replayData) {
      const frame = this.replayData.frames[this.replayTick];
      if (frame) {
        this.playerInput = frame.inputs;
        this.replayTick++;
      }
    }

    // Get current segment
    const getSegment = (distance: number): TrackSegment => {
      let acc = 0;
      for (const seg of this.track) {
        acc += seg.length;
        if (distance < acc) return seg;
      }
      return this.track[this.track.length - 1];
    };

    // Update physics
    const human = this.players.find(p => !p.isBot)!;
    updatePlayerPhysics(human, this.playerInput, getSegment(human.distanceTraveled), dt);

    // Update bots
    this.players.filter(p => p.isBot && !p.finished).forEach(bot => {
      const ctrl = this.botControllers.get(bot.id);
      if (ctrl) {
        const botInput = ctrl.update(bot, this.players, getSegment(bot.distanceTraveled), this.rng);
        updatePlayerPhysics(bot, botInput, getSegment(bot.distanceTraveled), dt);
      }
    });

    // Collisions between players
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        if (checkPlayerCollision(this.players[i], this.players[j])) {
          resolveCollision(this.players[i], this.players[j]);
          this.audioManager.playSfx('collision');
          if (!this.players[i].isBot || !this.players[j].isBot) {
            this.cameras.main.shake(100, 0.005);
          }
        }
      }
    }

    // Obstacle/powerup collisions
    this.checkWorldObjectCollisions(human);

    // Finish checks
    this.players.forEach(p => {
      if (!p.finished && p.distanceTraveled >= this.totalTrackLength) {
        this.finishCount++;
        p.finished = true;
        p.finishTime = this.elapsedTime;
        p.finishPosition = this.finishCount;
        p.score = calculateScore(this.finishCount, this.players.length, this.elapsedTime, this.settings.matchLength);
        if (!p.isBot) this.audioManager.playSfx('splash');
      }
    });

    // Time limit / all finished
    if (this.elapsedTime >= this.settings.matchLength || this.players.every(p => p.finished)) {
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

    // Render the 3D scene
    this.render3D(human);
    this.updateHUD(human);
  }

  // ──────────────────────── Build helpers ────────────────────────

  private buildRenderSegments(): void {
    this.renderSegs = [];
    let worldZ = 0;
    let segIdx = 0;
    let segStart = 0;

    // Determine curve/slope per TrackSegment
    const curveMap: Record<string, number> = {
      straight: 0,
      curve_left: -3,
      curve_right: 3,
      ramp: 0,
      gap: 0,
      splitter: 0,
      narrow: 0,
    };

    while (worldZ < this.totalTrackLength + DRAW_DISTANCE * SEGMENT_LENGTH) {
      // Which TrackSegment are we in?
      while (segIdx < this.track.length - 1 && worldZ >= segStart + this.track[segIdx].length) {
        segStart += this.track[segIdx].length;
        segIdx++;
      }
      const seg = this.track[Math.min(segIdx, this.track.length - 1)];
      const frac = seg.length > 0 ? (worldZ - segStart) / seg.length : 0;

      const curve = curveMap[seg.type] || 0;
      const slope = seg.slope || 0;

      // Alternating colors every 3 segments for visible stripes
      const stripe = Math.floor(worldZ / SEGMENT_LENGTH) % 2 === 0;
      const c1 = stripe ? 0x00B4D8 : 0x0096C7;
      const c2 = stripe ? 0x48CAE4 : 0x0077B6;

      this.renderSegs.push({
        worldZ,
        screenX: 0,
        screenY: 0,
        screenW: 0,
        scale: 0,
        curve,
        slope,
        color1: c1,
        color2: c2,
        clip: 0,
        segmentIndex: segIdx,
        segFraction: frac,
      });

      worldZ += SEGMENT_LENGTH;
    }
  }

  private buildWorldObjects(): void {
    this.worldObjects = [];
    let segStart = 0;

    this.track.forEach((seg) => {
      // Obstacles
      seg.obstacles.forEach(obs => {
        const laneCenter = (obs.lane / (seg.lanes - 1)) * 2 - 1; // map lane to -1..1
        this.worldObjects.push({
          distance: segStart + obs.position * seg.length,
          laneOffset: laneCenter * 0.8,
          type: 'obstacle',
          collected: false,
          obstacleType: obs.type,
        });
      });

      // Powerups
      seg.powerups.forEach(pu => {
        const laneCenter = (pu.lane / (seg.lanes - 1)) * 2 - 1;
        this.worldObjects.push({
          distance: segStart + pu.position * seg.length,
          laneOffset: laneCenter * 0.8,
          type: 'powerup',
          collected: false,
          powerupType: pu.type,
        });
      });

      segStart += seg.length;
    });
  }

  private createPlayers(): void {
    const botCount = this.settings.botCount;
    const totalLanes = this.track[0]?.lanes || 5;

    // Human player
    const humanPlayer = createPlayerState('player', 'You', Math.floor(totalLanes / 2), false, 0);
    this.players.push(humanPlayer);

    // Bots
    const profiles: PlayerState['botProfile'][] = ['casual', 'aggressive', 'speedster', 'trickster', 'adaptive'];
    for (let i = 0; i < botCount; i++) {
      const lane = i % totalLanes;
      const profile = profiles[i % profiles.length];
      const bot = createPlayerState(`bot_${i}`, `Bot ${i + 1}`, lane, true, (i + 1) % 8, profile);
      this.players.push(bot);
      this.botControllers.set(bot.id, new BotController(profile!, this.rng));
    }
  }

  // ──────────────────────── Collision checks ────────────────────────

  private checkWorldObjectCollisions(human: PlayerState): void {
    const lanes = this.track[0]?.lanes || 5;

    this.worldObjects.forEach(obj => {
      if (obj.collected) return;

      this.players.forEach(p => {
        if (p.finished || p.isJumping) return;

        const dz = Math.abs(p.distanceTraveled - obj.distance);
        if (dz > 30) return; // too far

        // Convert player X to -1..1 range
        const halfWidth = (lanes * PHYSICS.LANE_WIDTH) / 2;
        const centerX = PHYSICS.SLIDE_WIDTH / 2;
        const playerNorm = (p.x - centerX) / halfWidth; // -1 to 1

        const dx = Math.abs(playerNorm - obj.laneOffset);
        if (dx > 0.35) return; // different lane

        // Hit!
        if (obj.type === 'obstacle' && obj.obstacleType) {
          if (!p.hasShield) {
            applyObstacleEffect(p, obj.obstacleType as 'barrel' | 'ring' | 'bumper');
          }
          obj.collected = true;
          if (!p.isBot) this.audioManager.playSfx('collision');
        } else if (obj.type === 'powerup' && obj.powerupType) {
          applyPowerup(p, obj.powerupType as 'speed_boost' | 'shield' | 'jump_boost');
          obj.collected = true;
          if (!p.isBot) this.audioManager.playSfx('powerup');
        }
      });
    });
  }

  // ──────────────────────── 3D Rendering ────────────────────────

  private render3D(human: PlayerState): void {
    const { width, height } = this.cameras.main;
    const gfx = this.gfx;
    gfx.clear();

    // Sky gradient
    this.drawSky(gfx, width, height);

    const playerZ = human.distanceTraveled;
    const playerScreenX = this.getPlayerScreenX(human);

    // Project segments
    const startSeg = Math.max(0, Math.floor(playerZ / SEGMENT_LENGTH));
    const endSeg = Math.min(this.renderSegs.length - 1, startSeg + DRAW_DISTANCE);

    let maxY = height; // clip line (nothing below this)
    let curveAccum = 0;
    let slopeAccum = 0;

    // Project all visible segments
    for (let i = startSeg; i <= endSeg; i++) {
      const seg = this.renderSegs[i];
      if (!seg) continue;

      const camZ = playerZ; // camera at player position
      const dz = seg.worldZ - camZ;
      if (dz <= 0) continue;

      // Perspective projection
      const scale = CAMERA_DEPTH / dz;
      seg.scale = scale;
      seg.screenX = width / 2 + curveAccum * scale * width;
      seg.screenY = height / 2 - (CAMERA_HEIGHT * scale) + slopeAccum * scale * height;
      seg.screenW = (ROAD_WIDTH / 2) * scale;
      seg.clip = maxY;

      curveAccum += seg.curve * SEGMENT_LENGTH * 0.0004;
      slopeAccum += seg.slope * SEGMENT_LENGTH * 0.0003;
    }

    // Draw from back to front
    for (let i = endSeg; i > startSeg; i--) {
      const s = this.renderSegs[i];
      const prev = this.renderSegs[i - 1];
      if (!s || !prev || s.scale <= 0 || prev.scale <= 0) continue;
      if (prev.screenY >= s.clip) continue;

      // Clamp drawing
      const y1 = Math.max(0, prev.screenY);
      const y2 = Math.min(height, s.screenY);
      if (y1 >= y2) continue;

      // Draw grass / ground
      gfx.fillStyle(i % 2 === 0 ? 0x10AA50 : 0x009944, 1);
      gfx.fillRect(0, y1, width, y2 - y1);

      // Draw track surface (trapezoid)
      this.drawTrapezoid(gfx, prev.screenX, prev.screenW, y1,
                         s.screenX, s.screenW, y2, s.color1);

      // Track center line
      const centerW1 = prev.screenW * 0.02;
      const centerW2 = s.screenW * 0.02;
      this.drawTrapezoid(gfx, prev.screenX, centerW1, y1,
                         s.screenX, centerW2, y2, 0xFFFFFF);

      // Lane lines (dashed)
      if (i % 4 < 2) {
        for (let lane = 1; lane < TOTAL_LANES; lane++) {
          const lanePos = (lane / TOTAL_LANES) * 2 - 1;
          const lw1 = prev.screenW * 0.01;
          const lw2 = s.screenW * 0.01;
          const lx1 = prev.screenX + lanePos * prev.screenW;
          const lx2 = s.screenX + lanePos * s.screenW;
          this.drawTrapezoid(gfx, lx1, lw1, y1, lx2, lw2, y2, 0x48CAE4);
        }
      }

      // Side rails (water edges)
      const railW1 = prev.screenW * 0.08;
      const railW2 = s.screenW * 0.08;
      // Left rail
      this.drawTrapezoid(gfx, prev.screenX - prev.screenW - railW1 / 2, railW1, y1,
                         s.screenX - s.screenW - railW2 / 2, railW2, y2, s.color2);
      // Right rail
      this.drawTrapezoid(gfx, prev.screenX + prev.screenW + railW1 / 2, railW1, y1,
                         s.screenX + s.screenW + railW2 / 2, railW2, y2, s.color2);

      // Water shimmer effect
      if (i % 6 === 0) {
        const shimmerAlpha = 0.15 + Math.sin(this.elapsedTime * 3 + i) * 0.1;
        gfx.fillStyle(0xADE8F4, shimmerAlpha);
        this.fillTrapezoid(gfx, prev.screenX, prev.screenW * 0.9, y1,
                           s.screenX, s.screenW * 0.9, y2);
      }
    }

    // Draw world objects (obstacles, powerups) and players on top of the track
    this.drawWorldObjects(gfx, human, startSeg, endSeg, width, height);
    this.drawPlayers(gfx, human, width, height);

    // Draw finish line if close
    this.drawFinishLine(gfx, human, width, height);

    // Water splash effect at bottom
    this.drawWaterSplash(gfx, human, width, height);
  }

  private drawSky(gfx: Phaser.GameObjects.Graphics, w: number, h: number): void {
    // Gradient sky
    const steps = 8;
    const skyH = h / 2;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(0x48 + (0xAD - 0x48) * t);
      const g2 = Math.floor(0xCA + (0xE8 - 0xCA) * t);
      const b = Math.floor(0xE4 + (0xF4 - 0xE4) * t);
      const color = (r << 16) | (g2 << 8) | b;
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, (skyH / steps) * i, w, skyH / steps + 1);
    }

    // Clouds
    gfx.fillStyle(0xFFFFFF, 0.5);
    const cloudOffset = this.elapsedTime * 5;
    gfx.fillEllipse(((80 + cloudOffset) % (w + 100)) - 50, 60, 70, 22);
    gfx.fillEllipse(((220 + cloudOffset * 0.7) % (w + 100)) - 50, 40, 90, 28);
    gfx.fillEllipse(((350 + cloudOffset * 0.5) % (w + 100)) - 50, 80, 55, 18);

    // Mountains in background
    gfx.fillStyle(0x2D6A4F, 1);
    const mh = h * 0.25;
    const my = h / 2 - mh * 0.3;
    gfx.fillTriangle(0, my + mh, w * 0.25, my, w * 0.5, my + mh);
    gfx.fillStyle(0x40916C, 1);
    gfx.fillTriangle(w * 0.3, my + mh, w * 0.6, my - mh * 0.15, w * 0.9, my + mh);
    gfx.fillStyle(0x52B788, 1);
    gfx.fillTriangle(w * 0.15, my + mh, w * 0.45, my + mh * 0.3, w * 0.75, my + mh);
  }

  private drawTrapezoid(
    gfx: Phaser.GameObjects.Graphics,
    x1: number, w1: number, y1: number,
    x2: number, w2: number, y2: number,
    color: number
  ): void {
    gfx.fillStyle(color, 1);
    gfx.fillTriangle(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2);
    gfx.fillTriangle(x1 - w1, y1, x2 - w2, y2, x2 + w2, y2);
  }

  private fillTrapezoid(
    gfx: Phaser.GameObjects.Graphics,
    x1: number, w1: number, y1: number,
    x2: number, w2: number, y2: number,
  ): void {
    gfx.fillTriangle(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2);
    gfx.fillTriangle(x1 - w1, y1, x2 - w2, y2, x2 + w2, y2);
  }

  private drawWorldObjects(
    gfx: Phaser.GameObjects.Graphics,
    human: PlayerState,
    startSeg: number, endSeg: number,
    _w: number, h: number
  ): void {
    const playerZ = human.distanceTraveled;

    // Collect visible objects and sort by distance (far first)
    const visible = this.worldObjects
      .filter(obj => {
        if (obj.collected) return false;
        const dz = obj.distance - playerZ;
        return dz > 0 && dz < DRAW_DISTANCE * SEGMENT_LENGTH;
      })
      .sort((a, b) => b.distance - a.distance);

    visible.forEach(obj => {
      const segIndex = Math.floor(obj.distance / SEGMENT_LENGTH);
      if (segIndex < startSeg || segIndex >= endSeg || segIndex >= this.renderSegs.length) return;
      const seg = this.renderSegs[segIndex];
      if (!seg || seg.scale <= 0 || seg.screenY > h || seg.screenY < 0) return;

      const screenX = seg.screenX + obj.laneOffset * seg.screenW;
      const screenY = seg.screenY;
      const size = seg.scale * 250;

      if (size < 2) return;

      if (obj.type === 'obstacle') {
        // Bright, dangerous obstacle colors
        const colors: Record<string, number> = {
          barrel: 0xCC3300,
          ring: 0xFF2222,
          bumper: 0xFF6600,
        };
        const c = colors[obj.obstacleType || 'barrel'] || 0xCC3300;
        // Danger glow (pulsing)
        const pulse = 0.4 + Math.sin(this.elapsedTime * 6 + obj.distance) * 0.2;
        gfx.fillStyle(0xFF0000, pulse);
        gfx.fillCircle(screenX, screenY - size / 2, size * 2.0);
        // Main body
        gfx.fillStyle(c, 1);
        gfx.fillCircle(screenX, screenY - size / 2, size);
        // Warning cross on obstacle
        if (size > 4) {
          gfx.lineStyle(Math.max(1, size * 0.2), 0xFFFF00, 0.9);
          gfx.lineBetween(screenX - size * 0.5, screenY - size, screenX + size * 0.5, screenY);
          gfx.lineBetween(screenX + size * 0.5, screenY - size, screenX - size * 0.5, screenY);
        }
        // Highlight
        gfx.fillStyle(0xFFFFFF, 0.3);
        gfx.fillCircle(screenX - size * 0.3, screenY - size * 0.8, size * 0.3);
      } else if (obj.type === 'powerup') {
        // Glowing powerup with strong pulsing
        const colors: Record<string, number> = {
          speed_boost: 0xFFD700,
          shield: 0x4FC3F7,
          jump_boost: 0x76FF03,
        };
        const c = colors[obj.powerupType || 'speed_boost'] || 0xFFD700;
        // Pulsing glow
        const glowPulse = 1.5 + Math.sin(this.elapsedTime * 5 + obj.distance * 0.1) * 0.5;
        gfx.fillStyle(c, 0.35);
        gfx.fillCircle(screenX, screenY - size / 2, size * glowPulse * 1.2);
        // Core
        gfx.fillStyle(c, 1);
        gfx.fillCircle(screenX, screenY - size / 2, size);
        // Star sparkle
        gfx.fillStyle(0xFFFFFF, 0.9);
        gfx.fillCircle(screenX, screenY - size * 0.8, size * 0.35);
        // Rotating sparkle dots
        if (size > 4) {
          const angle = this.elapsedTime * 3;
          for (let s = 0; s < 4; s++) {
            const a = angle + (s * Math.PI / 2);
            const sx = screenX + Math.cos(a) * size * 1.3;
            const sy = (screenY - size / 2) + Math.sin(a) * size * 1.3;
            gfx.fillStyle(0xFFFFFF, 0.6);
            gfx.fillCircle(sx, sy, size * 0.15);
          }
        }
      }
    });
  }

  private drawPlayers(
    gfx: Phaser.GameObjects.Graphics,
    human: PlayerState,
    w: number, h: number
  ): void {
    const playerZ = human.distanceTraveled;
    const lanes = this.track[0]?.lanes || 5;
    const halfWidth = (lanes * PHYSICS.LANE_WIDTH) / 2;
    const centerX = PHYSICS.SLIDE_WIDTH / 2;

    // Sort players by distance (far first) for correct drawing order
    const sorted = [...this.players]
      .filter(p => !p.finished || Math.abs(p.distanceTraveled - playerZ) < DRAW_DISTANCE * SEGMENT_LENGTH)
      .sort((a, b) => b.distanceTraveled - a.distanceTraveled);

    sorted.forEach(p => {
      const dz = p.distanceTraveled - playerZ;

      let screenX: number, screenY: number, scale: number;

      if (p.id === human.id) {
        // Human player always at bottom-center
        screenX = w / 2 + this.getPlayerScreenX(human) * w * 0.3;
        screenY = h * 0.82;
        scale = 0.5;
        if (p.isJumping) screenY -= 20;
      } else {
        // Other players projected in 3D
        if (dz <= -50 || dz > DRAW_DISTANCE * SEGMENT_LENGTH) return;

        const projDz = Math.max(10, dz + 50); // offset so nearby bots are visible
        scale = CAMERA_DEPTH / projDz;
        if (scale < 0.03) return;

        // Find render segment for this distance
        const segIdx = Math.floor(p.distanceTraveled / SEGMENT_LENGTH);
        const seg = this.renderSegs[segIdx];
        if (!seg) return;

        const lateralNorm = (p.x - centerX) / halfWidth;
        screenX = seg.screenX + lateralNorm * seg.screenW;
        screenY = seg.screenY;

        if (screenY < 0 || screenY > h) return;
        if (p.isJumping) screenY -= 15 * scale * 20;
      }

      const baseSize = scale * 200;
      if (baseSize < 3) return;
      const color = PLAYER_COLORS[p.skinIndex] || 0xFF6B6B;

      // Draw character on tube
      // Tube (ellipse)
      gfx.fillStyle(0xFFFFFF, 0.85);
      gfx.fillEllipse(screenX, screenY, baseSize * 1.4, baseSize * 0.5);
      gfx.lineStyle(Math.max(1, baseSize * 0.08), color, 1);
      gfx.strokeEllipse(screenX, screenY, baseSize * 1.4, baseSize * 0.5);

      // Body
      gfx.fillStyle(color, 1);
      gfx.fillEllipse(screenX, screenY - baseSize * 0.5, baseSize * 0.7, baseSize * 0.6);

      // Head
      gfx.fillStyle(color, 1);
      gfx.fillCircle(screenX, screenY - baseSize * 1.0, baseSize * 0.45);

      // Face
      if (baseSize > 8) {
        gfx.fillStyle(0x000000, 1);
        gfx.fillCircle(screenX - baseSize * 0.15, screenY - baseSize * 1.05, baseSize * 0.07);
        gfx.fillCircle(screenX + baseSize * 0.15, screenY - baseSize * 1.05, baseSize * 0.07);
        // Smile
        gfx.lineStyle(Math.max(1, baseSize * 0.04), 0x000000, 1);
        gfx.beginPath();
        gfx.arc(screenX, screenY - baseSize * 0.85, baseSize * 0.15, 0, Math.PI, false);
        gfx.strokePath();
      }

      // Shield effect
      if (p.hasShield) {
        gfx.lineStyle(2, 0x4FC3F7, 0.6);
        gfx.strokeCircle(screenX, screenY - baseSize * 0.5, baseSize * 1.2);
      }

      // Stun flash
      if (p.stunTimer > 0 && Math.floor(this.elapsedTime * 10) % 2 === 0) {
        gfx.fillStyle(0xFFFFFF, 0.4);
        gfx.fillCircle(screenX, screenY - baseSize * 0.5, baseSize * 0.8);
      }

      // Speed boost trail
      if (p.speedBoostTimer > 0) {
        gfx.fillStyle(0xFFD700, 0.3);
        gfx.fillEllipse(screenX, screenY + baseSize * 0.3, baseSize * 0.4, baseSize * 1.5);
      }

      // Name tag for nearby bots
      if (p.isBot && baseSize > 12) {
        // We can't easily draw text in graphics, so skip for now - players are color-coded
      }
    });
  }

  private drawFinishLine(
    gfx: Phaser.GameObjects.Graphics,
    human: PlayerState,
    w: number, h: number
  ): void {
    const dz = this.totalTrackLength - human.distanceTraveled;
    if (dz <= 0 || dz > DRAW_DISTANCE * SEGMENT_LENGTH) return;

    const segIdx = Math.floor(this.totalTrackLength / SEGMENT_LENGTH);
    const seg = this.renderSegs[segIdx];
    if (!seg || seg.screenY < 0 || seg.screenY > h) return;

    // Checkered finish line
    const y = seg.screenY;
    const lineW = seg.screenW * 2;
    const lineH = Math.max(3, seg.scale * 100);
    const checks = 10;
    const checkW = lineW / checks;

    for (let i = 0; i < checks; i++) {
      const cx = seg.screenX - lineW / 2 + i * checkW;
      gfx.fillStyle(i % 2 === 0 ? 0xFFFFFF : 0x000000, 1);
      gfx.fillRect(cx, y - lineH, checkW, lineH / 2);
      gfx.fillStyle(i % 2 === 0 ? 0x000000 : 0xFFFFFF, 1);
      gfx.fillRect(cx, y - lineH / 2, checkW, lineH / 2);
    }
  }

  private drawWaterSplash(
    gfx: Phaser.GameObjects.Graphics,
    human: PlayerState,
    w: number, h: number
  ): void {
    if (human.forwardSpeed < PHYSICS.MAX_FORWARD_SPEED * 0.1) return;

    const px = w / 2 + this.getPlayerScreenX(human) * w * 0.3;
    const py = h * 0.87;
    const intensity = Math.min(1, human.forwardSpeed / PHYSICS.MAX_FORWARD_SPEED);

    // Splash droplets (more at high speed)
    const count = Math.floor(2 + intensity * 10);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const dist = 8 + Math.random() * 30 * intensity;
      const sx = px + Math.cos(angle) * dist;
      const sy = py + Math.sin(angle) * dist * 0.5;
      const size = 1.5 + Math.random() * 3 * intensity;
      gfx.fillStyle(0xADE8F4, 0.5 + intensity * 0.3);
      gfx.fillCircle(sx, sy, size);
    }

    // Wake trail behind player
    gfx.fillStyle(0xCAF0F8, 0.2 + intensity * 0.15);
    gfx.fillEllipse(px, py + 5, 30 + intensity * 40, 8 + intensity * 6);

    // Speed lines along the sides of the track at moderate+ speed
    if (intensity > 0.3) {
      const lineCount = Math.floor(intensity * 10);
      const alpha = 0.15 + intensity * 0.25;
      gfx.lineStyle(1, 0xFFFFFF, alpha);
      for (let i = 0; i < lineCount; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const lx = px + side * (30 + Math.random() * 50);
        const ly = h * 0.5 + Math.random() * (h * 0.35);
        const lineLen = 10 + intensity * 25;
        gfx.lineBetween(lx, ly, lx, ly + lineLen);
      }
    }
  }

  private getPlayerScreenX(human: PlayerState): number {
    const lanes = this.track[0]?.lanes || 5;
    const halfWidth = (lanes * PHYSICS.LANE_WIDTH) / 2;
    const centerX = PHYSICS.SLIDE_WIDTH / 2;
    return (human.x - centerX) / halfWidth;
  }

  // ──────────────────────── HUD ────────────────────────

  private createHUD(w: number): void {
    this.hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(900);

    // Top bar
    const topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.5);
    topBar.fillRect(0, 0, w, 50);
    this.hudContainer.add(topBar);

    // Position
    this.posText = this.add.text(15, 12, '#-', {
      fontSize: '22px', fontFamily: 'Arial', color: '#FFD700', fontStyle: 'bold',
    });
    this.hudContainer.add(this.posText);

    // Time
    this.timeText = this.add.text(w / 2, 12, '0:00', {
      fontSize: '18px', fontFamily: 'Arial', color: '#FFFFFF',
    }).setOrigin(0.5, 0);
    this.hudContainer.add(this.timeText);

    // Speed
    this.speedText = this.add.text(w - 15, 12, '0 km/h', {
      fontSize: '16px', fontFamily: 'Arial', color: '#90E0EF',
    }).setOrigin(1, 0);
    this.hudContainer.add(this.speedText);

    // Progress bar
    this.progressBar = this.add.graphics();
    this.hudContainer.add(this.progressBar);

    // Powerup indicator
    this.powerupText = this.add.text(w / 2, 38, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#FFD700',
    }).setOrigin(0.5, 0);
    this.hudContainer.add(this.powerupText);
  }

  private updateHUD(human: PlayerState): void {
    const w = this.cameras.main.width;

    // Position: rank among all players by distance traveled
    const rank = this.players.filter(p => p.distanceTraveled > human.distanceTraveled).length + 1;
    this.posText.setText(`#${rank}`);
    // Color by position: gold for 1st, silver for 2nd, bronze for 3rd
    this.posText.setColor(rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#FFFFFF');

    // Time
    const m = Math.floor(this.elapsedTime / 60);
    const s = Math.floor(this.elapsedTime % 60);
    const cs = Math.floor((this.elapsedTime % 1) * 100);
    this.timeText.setText(`${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`);

    // Speed
    this.speedText.setText(`${Math.floor(human.forwardSpeed)} km/h`);
    this.speedText.setColor(human.speedBoostTimer > 0 ? '#FFD700' : human.hasShield ? '#4FC3F7' : '#90E0EF');

    // Progress bar with bot markers
    const progress = Math.min(1, human.distanceTraveled / this.totalTrackLength);
    this.progressBar.clear();
    // Background
    this.progressBar.fillStyle(0x003566, 0.8);
    this.progressBar.fillRoundedRect(10, 52, w - 20, 10, 5);
    // Player progress (bright)
    this.progressBar.fillStyle(0x00B4D8, 1);
    this.progressBar.fillRoundedRect(10, 52, (w - 20) * progress, 10, 5);
    // Bot markers on progress bar
    this.players.forEach(p => {
      if (p.isBot && !p.finished) {
        const botProgress = Math.min(1, p.distanceTraveled / this.totalTrackLength);
        const bx = 10 + (w - 20) * botProgress;
        const color = PLAYER_COLORS[p.skinIndex] || 0xFF6B6B;
        this.progressBar.fillStyle(color, 0.9);
        this.progressBar.fillCircle(bx, 57, 4);
      }
    });
    // Player marker on progress bar (larger, on top)
    const playerBarX = 10 + (w - 20) * progress;
    this.progressBar.fillStyle(0xFFFFFF, 1);
    this.progressBar.fillCircle(playerBarX, 57, 6);
    this.progressBar.lineStyle(1, 0x00B4D8, 1);
    this.progressBar.strokeCircle(playerBarX, 57, 6);

    // Powerup indicator
    if (human.speedBoostTimer > 0) {
      this.powerupText.setText(`SPEED BOOST ${Math.ceil(human.speedBoostTimer)}s`);
      this.powerupText.setColor('#FFD700');
    } else if (human.hasShield) {
      this.powerupText.setText(`SHIELD ${Math.ceil(human.shieldTimer)}s`);
      this.powerupText.setColor('#4FC3F7');
    } else if (human.jumpBoostTimer > 0) {
      this.powerupText.setText(`JUMP BOOST ${Math.ceil(human.jumpBoostTimer)}s`);
      this.powerupText.setColor('#76FF03');
    } else {
      this.powerupText.setText('');
    }
  }

  // ──────────────────────── Countdown ────────────────────────

  private showCountdown(): void {
    const { width, height } = this.cameras.main;
    const countText = this.add.text(width / 2, height / 2 - 50, '3', {
      fontSize: '72px', fontFamily: 'Arial', color: '#FFD700',
      stroke: '#003566', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    let count = 3;
    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        count--;
        if (count > 0) {
          countText.setText(count.toString());
          this.tweens.add({ targets: countText, scaleX: 1.5, scaleY: 1.5, duration: 200, yoyo: true });
        } else if (count === 0) {
          countText.setText('GO!');
          countText.setColor('#76FF03');
          this.tweens.add({
            targets: countText, scaleX: 2, scaleY: 2, alpha: 0, duration: 500,
            onComplete: () => {
              countText.destroy();
              this.isCountingDown = false;
              this.audioManager.playMusic();
            },
          });
        }
      },
    });

    // Draw initial frame
    const human = this.players.find(p => !p.isBot)!;
    this.render3D(human);
  }

  // ──────────────────────── End Game ────────────────────────

  private async endGame(): Promise<void> {
    this.gameOver = true;
    this.audioManager.stopMusic();
    this.audioManager.playSfx('win');

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

      const stats = await StorageManager.loadStats();
      stats.totalRuns++;
      if (human.finishPosition === 1) stats.totalWins++;
      if (human.finishTime < stats.bestTime) stats.bestTime = human.finishTime;
      stats.totalScore += human.score;
      await StorageManager.saveStats(stats);
    }

    const sorted = [...this.players].sort((a, b) => a.finishPosition - b.finishPosition);
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

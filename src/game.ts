import { ROUND_DURATION, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { canAbsorb, growHole, overlapsForAbsorption } from './collision';
import { InputController } from './input';
import { Renderer } from './renderer';
import type { AbsorptionEffect, Camera, CityObject, Hole, RingEffect } from './types';
import { GameUI } from './ui';
import { createBots, createPlayer, generateObjects } from './world';
import { loadHighscore, saveHighscore } from './persistence';

export class SinkCityGame {
  private player = createPlayer();
  private bots = createBots();
  private objects = generateObjects();
  private absorptions: AbsorptionEffect[] = [];
  private rings: RingEffect[] = [];
  private camera: Camera = { x: this.player.x, y: this.player.y, viewportWidth: innerWidth, viewportHeight: innerHeight };
  private input: InputController;
  private running = false;
  private remaining = ROUND_DURATION;
  private lastFrame = performance.now();
  private elapsed = 0;
  private frameId = 0;

  constructor(private readonly renderer: Renderer, private readonly ui: GameUI, canvas: HTMLCanvasElement) {
    this.input = new InputController(canvas);
    this.ui.setHighscore(loadHighscore());
    this.ui.startButton.addEventListener('click', () => this.start());
    this.ui.restartButton.addEventListener('click', () => this.start());
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
    // Required initial render: the city is already visible before any input.
    this.renderSafely();
    this.frameId = requestAnimationFrame(this.loop);
  }

  private start(): void {
    this.player = createPlayer();
    this.bots = createBots();
    this.objects = generateObjects();
    this.absorptions = [];
    this.rings = [];
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.remaining = ROUND_DURATION;
    this.elapsed = 0;
    this.running = true;
    this.lastFrame = performance.now();
    this.ui.showGame();
    this.updateUISafely();
    this.renderSafely();
  }

  private readonly loop = (timestamp: number): void => {
    const delta = Math.min((timestamp - this.lastFrame) / 1000, 0.05);
    this.lastFrame = timestamp;
    if (this.running) this.update(delta);
    else this.updateAmbient(delta);
    this.renderSafely();
    this.frameId = requestAnimationFrame(this.loop);
  };

  private update(delta: number): void {
    this.elapsed += delta;
    this.remaining -= delta;
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.running = false;
      this.ui.setHighscore(saveHighscore(this.player.score));
      this.ui.showResult(this.player, this.bots);
    }

    this.updatePlayer(delta);
    this.updateBots(delta);
    this.updateAbsorptions(delta);
    this.updateRespawns();
    this.updateCamera(delta);
    this.updateUISafely();
  }

  private updateAmbient(delta: number): void {
    this.elapsed += delta;
    this.updateBots(delta * .22);
    this.updateCamera(delta);
  }

  private updatePlayer(delta: number): void {
    if (!this.player.alive) return;
    const direction = this.input.getDirection();
    const speed = Math.max(105, 205 - this.player.radius * .85);
    const smoothing = 1 - Math.exp(-10 * delta);
    this.player.velocity.x += (direction.x * speed - this.player.velocity.x) * smoothing;
    this.player.velocity.y += (direction.y * speed - this.player.velocity.y) * smoothing;
    this.moveHole(this.player, delta);
    this.absorbObjects(this.player);
    this.resolveHoleCombat(this.player, this.bots);
  }

  private updateBots(delta: number): void {
    this.bots.forEach((bot, index) => {
      if (!bot.alive) return;
      const angle = this.elapsed * (.32 + index * .04) + index * 1.63;
      let desiredX = Math.cos(angle);
      let desiredY = Math.sin(angle * 1.23);
      const target = this.findBotTarget(bot);
      if (target) {
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        desiredX = dx / length;
        desiredY = dy / length;
      }
      const speed = Math.max(88, 165 - bot.radius * .55);
      const smoothing = 1 - Math.exp(-4 * delta);
      bot.velocity.x += (desiredX * speed - bot.velocity.x) * smoothing;
      bot.velocity.y += (desiredY * speed - bot.velocity.y) * smoothing;
      this.moveHole(bot, delta);
      this.absorbObjects(bot);
    });
    for (const bot of this.bots) this.resolveHoleCombat(bot, [this.player, ...this.bots.filter((other) => other !== bot)]);
  }

  private findBotTarget(bot: Hole): CityObject | undefined {
    let best: CityObject | undefined;
    let bestDistance = 235;
    for (const object of this.objects) {
      if (!canAbsorb(bot, object)) continue;
      const distance = Math.hypot(bot.x - object.x, bot.y - object.y);
      if (distance < bestDistance) { best = object; bestDistance = distance; }
    }
    return best;
  }

  private moveHole(hole: Hole, delta: number): void {
    hole.x = Math.max(hole.radius, Math.min(WORLD_WIDTH - hole.radius, hole.x + hole.velocity.x * delta));
    hole.y = Math.max(hole.radius, Math.min(WORLD_HEIGHT - hole.radius, hole.y + hole.velocity.y * delta));
  }

  private absorbObjects(hole: Hole): void {
    for (const object of this.objects) {
      if (!canAbsorb(hole, object) || !overlapsForAbsorption(hole, object)) continue;
      object.active = false;
      object.respawnAt = this.elapsed + 8 + (object.id % 5);
      this.absorptions.push({
        kind: object.kind, color: object.color, radius: object.radius,
        x: object.x, y: object.y, from: { x: object.x, y: object.y },
        to: { x: hole.x, y: hole.y }, age: 0, duration: .32
      });
      this.rings.push({ x: hole.x, y: hole.y, age: 0, duration: .48, color: hole.color, startRadius: hole.radius });
      growHole(hole, object.points);
    }
  }

  private resolveHoleCombat(attacker: Hole, targets: Hole[]): void {
    if (!attacker.alive) return;
    for (const target of targets) {
      if (!target.alive || attacker.radius < target.radius * 1.2) continue;
      if (Math.hypot(attacker.x - target.x, attacker.y - target.y) >= attacker.radius * .62) continue;
      target.alive = false;
      target.respawnAt = this.elapsed + 2.6;
      attacker.score += Math.round(target.score * .12 + 75);
      attacker.radius = Math.min(88, attacker.radius + 3);
      this.rings.push({ x: attacker.x, y: attacker.y, age: 0, duration: .8, color: attacker.color, startRadius: attacker.radius });
    }
  }

  private updateRespawns(): void {
    for (const object of this.objects) {
      if (!object.active && this.elapsed >= object.respawnAt) object.active = true;
    }
    for (const hole of [this.player, ...this.bots]) {
      if (hole.alive || this.elapsed < hole.respawnAt) continue;
      const numericId = hole.id === 'player' ? 2 : Number(hole.id.slice(-1)) + 3;
      hole.x = 150 + ((numericId * 421) % (WORLD_WIDTH - 300));
      hole.y = 150 + ((numericId * 283) % (WORLD_HEIGHT - 300));
      hole.radius = Math.max(23, hole.radius * .72);
      hole.alive = true;
      hole.velocity = { x: 0, y: 0 };
    }
  }

  private updateAbsorptions(delta: number): void {
    for (const effect of this.absorptions) effect.age += delta;
    for (const ring of this.rings) ring.age += delta;
    this.absorptions = this.absorptions.filter((effect) => effect.age < effect.duration);
    this.rings = this.rings.filter((ring) => ring.age < ring.duration);
  }

  private updateCamera(delta: number): void {
    const smoothing = 1 - Math.exp(-7 * delta);
    this.camera.x += (this.player.x - this.camera.x) * smoothing;
    this.camera.y += (this.player.y - this.camera.y) * smoothing;
    const halfWidth = this.camera.viewportWidth / 2;
    const halfHeight = this.camera.viewportHeight / 2;
    this.camera.x = WORLD_WIDTH < this.camera.viewportWidth ? WORLD_WIDTH / 2 : Math.max(halfWidth, Math.min(WORLD_WIDTH - halfWidth, this.camera.x));
    this.camera.y = WORLD_HEIGHT < this.camera.viewportHeight ? WORLD_HEIGHT / 2 : Math.max(halfHeight, Math.min(WORLD_HEIGHT - halfHeight, this.camera.y));
  }

  private handleResize(): void {
    const size = this.renderer.resize();
    this.camera.viewportWidth = size.width;
    this.camera.viewportHeight = size.height;
    this.updateCamera(1);
    this.renderSafely();
  }

  private renderSafely(): void {
    try {
      this.renderer.render({ camera: this.camera, objects: this.objects, bots: this.bots, player: this.player, absorptions: this.absorptions, rings: this.rings });
    } catch (error) {
      console.error('Sink City rendering failed:', error);
      const display = document.getElementById('render-error');
      if (display) { display.hidden = false; display.textContent = 'Das Spielfeld konnte nicht gezeichnet werden. Bitte lade die Seite neu.'; }
      cancelAnimationFrame(this.frameId);
    }
  }

  private updateUISafely(): void {
    try { this.ui.update(this.player, this.bots, this.remaining); }
    catch (error) { console.error('HUD update failed:', error); }
  }
}

import { WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { BUILDINGS, ROADS_X, ROADS_Y, ROAD_WIDTH } from './cityLayout';
import type { AbsorptionEffect, Camera, CityObject, Hole, RingEffect, Vec2 } from './types';

type RenderScene = {
  camera: Camera;
  objects: CityObject[];
  bots: Hole[];
  player: Hole;
  absorptions: AbsorptionEffect[];
  rings: RingEffect[];
};

export class Renderer {
  private context: CanvasRenderingContext2D;
  private pixelRatio = 1;
  private width = 1;
  private height = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas-2D-Kontext konnte nicht erstellt werden.');
    this.context = context;
    this.resize();
  }

  resize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    return { width: this.width, height: this.height };
  }

  render(scene: RenderScene): void {
    const { camera } = scene;
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.context.clearRect(0, 0, this.width, this.height);
    this.renderBackground();
    this.context.save();
    this.context.translate(this.width / 2 - camera.x, this.height / 2 - camera.y);
    this.renderMap(camera);
    this.renderObjects(scene.objects, camera);
    this.renderBots(scene.bots, camera);
    this.renderPlayer(scene.player);
    this.renderEffects(scene.absorptions, scene.rings);
    this.context.restore();
    this.renderVignette();
  }

  private renderBackground(): void {
    const gradient = this.context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#78c59a');
    gradient.addColorStop(1, '#58a97f');
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);
  }

  private renderMap(camera: Camera): void {
    const ctx = this.context;
    ctx.fillStyle = '#72bd8e';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Small turf pattern makes uncovered areas feel alive.
    ctx.fillStyle = 'rgba(255,255,255,.075)';
    for (let x = 20; x < WORLD_WIDTH; x += 55) {
      for (let y = 24; y < WORLD_HEIGHT; y += 55) ctx.fillRect(x, y, 3, 3);
    }

    ctx.fillStyle = '#d5d4cc';
    ROADS_X.forEach((x) => ctx.fillRect(x - ROAD_WIDTH / 2 - 18, 0, ROAD_WIDTH + 36, WORLD_HEIGHT));
    ROADS_Y.forEach((y) => ctx.fillRect(0, y - ROAD_WIDTH / 2 - 18, WORLD_WIDTH, ROAD_WIDTH + 36));
    ctx.fillStyle = '#4f5a63';
    ROADS_X.forEach((x) => ctx.fillRect(x - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD_HEIGHT));
    ROADS_Y.forEach((y) => ctx.fillRect(0, y - ROAD_WIDTH / 2, WORLD_WIDTH, ROAD_WIDTH));

    ctx.strokeStyle = '#f8d96a';
    ctx.lineWidth = 4;
    ctx.setLineDash([25, 23]);
    ROADS_X.forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke(); });
    ROADS_Y.forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke(); });
    ctx.setLineDash([]);

    const view = this.viewBounds(camera, 250);
    for (const building of BUILDINGS) {
      if (building.x > view.right || building.x + building.width + building.depth < view.left || building.y > view.bottom || building.y + building.height + building.depth < view.top) continue;
      this.drawBuilding(building.x, building.y, building.width, building.height, building.variant, building.depth);
    }

    ctx.strokeStyle = 'rgba(17,48,50,.35)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, WORLD_WIDTH - 10, WORLD_HEIGHT - 10);
  }

  private drawBuilding(x: number, y: number, width: number, height: number, variant: number, depth: number): void {
    const ctx = this.context;
    const palette = [
      { roof: '#f5bd78', side: '#bd744c', front: '#d98b55' },
      { roof: '#ef9385', side: '#a94d59', front: '#c85f66' },
      { roof: '#83bdea', side: '#467da8', front: '#5895c4' },
      { roof: '#d9abe1', side: '#8d609d', front: '#ae79ba' }
    ][variant % 4];
    ctx.save();
    ctx.fillStyle = 'rgba(25,44,50,.24)';
    ctx.beginPath();
    ctx.roundRect(x + depth + 7, y + depth + 9, width, height, 8);
    ctx.fill();

    // Extruded right and lower façades stay inside the owning green plot.
    ctx.strokeStyle = '#354853';
    ctx.lineWidth = 3.5;
    ctx.fillStyle = palette.side;
    ctx.beginPath();
    ctx.moveTo(x + width, y + 5);
    ctx.lineTo(x + width + depth, y + depth);
    ctx.lineTo(x + width + depth, y + height + depth);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.front;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width + depth, y + height + depth);
    ctx.lineTo(x + depth, y + height + depth);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    const roofGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    roofGradient.addColorStop(0, '#ffffff55');
    roofGradient.addColorStop(.18, palette.roof);
    roofGradient.addColorStop(1, palette.front);
    ctx.fillStyle = roofGradient;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 8); ctx.lineTo(x + width - 10, y + 8); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,.72)';
    const windowSize = 18;
    for (let wx = x + 24; wx < x + width - 20; wx += 42) {
      for (let wy = y + 23; wy < y + height - 18; wy += 39) {
        ctx.fillRect(wx, wy, windowSize, 15);
        ctx.fillStyle = 'rgba(35,68,82,.22)';
        ctx.fillRect(wx + 8, wy, 2, 15);
        ctx.fillStyle = 'rgba(255,255,255,.72)';
      }
    }
    // Façade details underline the extrusion without changing the footprint.
    ctx.fillStyle = 'rgba(255,238,184,.72)';
    for (let wx = x + 24; wx < x + width - 15; wx += 40) ctx.fillRect(wx + 5, y + height + 3, 17, 5);
    ctx.restore();
  }

  private renderObjects(objects: CityObject[], camera: Camera): void {
    const view = this.viewBounds(camera, 80);
    for (const object of objects) {
      if (!object.active || object.x < view.left || object.x > view.right || object.y < view.top || object.y > view.bottom) continue;
      this.drawObject(object.kind, object.x, object.y, object.radius, object.color, object.rotation);
    }
  }

  private drawObject(kind: CityObject['kind'], x: number, y: number, radius: number, color: string, rotation: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(24,43,46,.25)';
    ctx.beginPath(); ctx.ellipse(5, 7, radius * 1.05, radius * .55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(rotation);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#31494c';
    if (kind === 'tree') {
      const crown = ctx.createRadialGradient(-radius * .35, -radius * .55, 1, 0, -3, radius * 1.15);
      crown.addColorStop(0, '#8af0a9'); crown.addColorStop(.38, color); crown.addColorStop(1, '#17734f');
      ctx.fillStyle = '#4f3529'; ctx.fillRect(-5, 0, 10, 20);
      ctx.fillStyle = '#8a6042'; ctx.fillRect(-3, 0, 5, 18);
      ctx.fillStyle = '#176646'; ctx.beginPath(); ctx.arc(3, 0, radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = crown; ctx.beginPath(); ctx.arc(0, -5, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(-radius * .35, -radius * .48, radius * .28, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'car') {
      ctx.fillStyle = '#26363e'; ctx.fillRect(-radius * .72, -radius * .57, radius * .38, radius * 1.14); ctx.fillRect(radius * .35, -radius * .57, radius * .38, radius * 1.14);
      ctx.fillStyle = '#963e50'; ctx.beginPath(); ctx.roundRect(-radius, -radius * .40, radius * 2, radius * .96, 7); ctx.fill();
      const body = ctx.createLinearGradient(0, -radius * .5, 0, radius * .5);
      body.addColorStop(0, '#ffffff77'); body.addColorStop(.2, color); body.addColorStop(1, color);
      ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(-radius, -radius * .54, radius * 2, radius * .9, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9ed8ea'; ctx.fillRect(-radius * .34, -radius * .41, radius * .68, radius * .58);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-radius * .82, -radius * .39, radius * .28, 3);
    } else if (kind === 'lamp') {
      ctx.fillStyle = '#263a42'; ctx.beginPath(); ctx.ellipse(0, radius, radius * .7, radius * .35, 0, 0, Math.PI * 2); ctx.fill();
      const pole = ctx.createLinearGradient(-3, 0, 3, 0); pole.addColorStop(0, '#263a42'); pole.addColorStop(.5, '#8297a0'); pole.addColorStop(1, '#263a42');
      ctx.fillStyle = pole; ctx.fillRect(-3, -radius, 6, radius * 2);
      ctx.shadowColor = color; ctx.shadowBlur = 9; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -radius, radius * .72, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowColor = 'transparent'; ctx.fillStyle = '#fffbd0'; ctx.beginPath(); ctx.arc(-2, -radius - 2, radius * .24, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'hydrant') {
      ctx.fillStyle = '#a42e35'; ctx.beginPath(); ctx.roundRect(-radius * .6 + 3, -radius + 4, radius * 1.2, radius * 2, 3); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-radius * .6, -radius, radius * 1.2, radius * 2, 3); ctx.fill(); ctx.stroke();
      ctx.fillRect(-radius, -radius * .35, radius * 2, radius * .55);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-radius * .35, -radius * .75, 2, radius * 1.15);
    } else if (kind === 'bench') {
      ctx.fillStyle = '#664b3e'; ctx.fillRect(-radius + 3, -radius * .42, radius * 2, radius * .46); ctx.fillRect(-radius + 3, radius * .22, radius * 2, radius * .5);
      ctx.fillStyle = color; ctx.fillRect(-radius, -radius * .56, radius * 2, radius * .4); ctx.fillRect(-radius, radius * .08, radius * 2, radius * .45);
      ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.fillRect(-radius + 2, -radius * .52, radius * 1.7, 2);
      ctx.fillStyle = '#3a4b52'; ctx.fillRect(-radius * .75, radius * .52, 3, radius * .55); ctx.fillRect(radius * .62, radius * .52, 3, radius * .55);
    } else {
      ctx.fillStyle = kind === 'trash' ? '#405c65' : '#875226';
      ctx.beginPath(); ctx.roundRect(-radius + 3, -radius + 5, radius * 2, radius * 2, kind === 'trash' ? 4 : 1); ctx.fill();
      const box = ctx.createLinearGradient(-radius, -radius, radius, radius);
      box.addColorStop(0, '#ffffff55'); box.addColorStop(.25, color); box.addColorStop(1, color);
      ctx.fillStyle = box; ctx.beginPath(); ctx.roundRect(-radius, -radius, radius * 2, radius * 1.75, kind === 'trash' ? 4 : 1); ctx.fill(); ctx.stroke();
      if (kind === 'crate') { ctx.beginPath(); ctx.moveTo(-radius, -radius); ctx.lineTo(radius, radius); ctx.moveTo(radius, -radius); ctx.lineTo(-radius, radius); ctx.stroke(); }
      else { ctx.fillStyle = '#4c646c'; ctx.fillRect(-radius * 1.05, -radius, radius * 2.1, 3); }
    }
    ctx.restore();
  }

  private renderBots(bots: Hole[], camera: Camera): void {
    const view = this.viewBounds(camera, 120);
    bots.filter((bot) => bot.alive && bot.x > view.left && bot.x < view.right && bot.y > view.top && bot.y < view.bottom)
      .forEach((bot) => this.drawHole(bot, false));
  }

  private renderPlayer(player: Hole): void { if (player.alive) this.drawHole(player, true); }

  private drawHole(hole: Hole, isPlayer: boolean): void {
    const ctx = this.context;
    const r = hole.radius;
    ctx.save();
    ctx.translate(hole.x, hole.y);
    ctx.fillStyle = 'rgba(17,27,34,.32)';
    ctx.beginPath(); ctx.ellipse(4, 9, r * 1.14, r * .82, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = hole.color;
    ctx.shadowBlur = isPlayer ? 18 : 10;
    ctx.fillStyle = hole.color;
    ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.fill();
    const gradient = ctx.createRadialGradient(-r * .25, -r * .3, 1, 0, 0, r);
    gradient.addColorStop(0, '#17232b'); gradient.addColorStop(.72, '#080d11'); gradient.addColorStop(1, '#000');
    ctx.shadowColor = 'transparent'; ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `800 ${isPlayer ? 13 : 11}px system-ui`;
    ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 4;
    ctx.fillText(isPlayer ? 'DU' : hole.name.toUpperCase(), 0, -r - 12);
    ctx.restore();
  }

  private renderEffects(absorptions: AbsorptionEffect[], rings: RingEffect[]): void {
    for (const effect of absorptions) {
      const progress = Math.min(1, effect.age / effect.duration);
      const eased = progress * progress;
      const x = effect.from.x + (effect.to.x - effect.from.x) * eased;
      const y = effect.from.y + (effect.to.y - effect.from.y) * eased;
      this.drawObject(effect.kind, x, y, effect.radius * (1 - progress * .72), effect.color, progress * 5);
    }
    for (const ring of rings) {
      const progress = ring.age / ring.duration;
      this.context.strokeStyle = ring.color;
      this.context.globalAlpha = 1 - progress;
      this.context.lineWidth = 4 * (1 - progress);
      this.context.beginPath();
      this.context.arc(ring.x, ring.y, ring.startRadius + progress * 34, 0, Math.PI * 2);
      this.context.stroke();
      this.context.globalAlpha = 1;
    }
  }

  private renderVignette(): void {
    const gradient = this.context.createRadialGradient(this.width / 2, this.height / 2, Math.min(this.width, this.height) * .25, this.width / 2, this.height / 2, Math.max(this.width, this.height) * .7);
    gradient.addColorStop(0, 'rgba(5,20,28,0)'); gradient.addColorStop(1, 'rgba(5,20,28,.2)');
    this.context.fillStyle = gradient; this.context.fillRect(0, 0, this.width, this.height);
  }

  private viewBounds(camera: Camera, padding: number): { left: number; right: number; top: number; bottom: number } {
    return { left: camera.x - this.width / 2 - padding, right: camera.x + this.width / 2 + padding, top: camera.y - this.height / 2 - padding, bottom: camera.y + this.height / 2 + padding };
  }

  screenToWorld(point: Vec2, camera: Camera): Vec2 {
    return { x: point.x - this.width / 2 + camera.x, y: point.y - this.height / 2 + camera.y };
  }
}

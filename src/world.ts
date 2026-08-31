import { BOT_COUNT, OBJECT_META, PLAYER_START_RADIUS, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { overlapsBuilding } from './cityLayout';
import type { CityObject, Hole, ObjectKind } from './types';

export function mulberry32(seed: number): () => number {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function generateObjects(seed = 73421): CityObject[] {
  const random = mulberry32(seed);
  const kinds = Object.keys(OBJECT_META) as ObjectKind[];
  const objects: CityObject[] = [];
  const findOpenPosition = (initialX: number, initialY: number, radius: number): { x: number; y: number } => {
    if (!overlapsBuilding(initialX, initialY, radius)) return { x: initialX, y: initialY };
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const distance = 35 + attempt * 6;
      const x = Math.max(radius + 12, Math.min(WORLD_WIDTH - radius - 12, initialX + Math.cos(angle) * distance));
      const y = Math.max(radius + 12, Math.min(WORLD_HEIGHT - radius - 12, initialY + Math.sin(angle) * distance));
      if (!overlapsBuilding(x, y, radius)) return { x, y };
    }
    // Deterministic grid fallback guarantees a legal position even in a dense block.
    for (let y = radius + 15; y < WORLD_HEIGHT - radius; y += 35) {
      for (let x = radius + 15; x < WORLD_WIDTH - radius; x += 35) {
        if (!overlapsBuilding(x, y, radius)) return { x, y };
      }
    }
    return { x: initialX, y: initialY };
  };

  // Dense center district guarantees a busy opening scene on every viewport.
  for (let index = 0; index < 72; index += 1) {
    const angle = index * 2.399963 + random() * 0.2;
    const distance = 85 + Math.sqrt(index / 72) * 500;
    const kind = kinds[index % kinds.length];
    const meta = OBJECT_META[kind];
    const position = findOpenPosition(
      WORLD_WIDTH / 2 + Math.cos(angle) * distance,
      WORLD_HEIGHT / 2 + Math.sin(angle) * distance * 0.68,
      meta.radius
    );
    objects.push({
      id: index,
      kind,
      x: position.x,
      y: position.y,
      radius: meta.radius,
      points: meta.points,
      color: meta.color,
      rotation: random() * Math.PI * 2,
      active: true,
      respawnAt: 0
    });
  }

  for (let index = 72; index < 220; index += 1) {
    const kind = kinds[Math.floor(random() * kinds.length)];
    const meta = OBJECT_META[kind];
    const position = findOpenPosition(75 + random() * (WORLD_WIDTH - 150), 75 + random() * (WORLD_HEIGHT - 150), meta.radius);
    objects.push({
      id: index,
      kind,
      x: position.x,
      y: position.y,
      radius: meta.radius,
      points: meta.points,
      color: meta.color,
      rotation: random() * Math.PI * 2,
      active: true,
      respawnAt: 0
    });
  }
  return objects;
}

export function createPlayer(): Hole {
  return {
    id: 'player', name: 'Du', x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2,
    radius: PLAYER_START_RADIUS, score: 0, color: '#25d9ff', alive: true,
    respawnAt: 0, velocity: { x: 0, y: 0 }
  };
}

export function createBots(): Hole[] {
  const names = ['Mara', 'Pixel', 'Nova', 'Kiro'];
  const colors = ['#ff5c8a', '#ffd04a', '#9b7bff', '#46e095'];
  const positions = [
    { x: -300, y: -180 }, { x: 330, y: -160 },
    { x: -340, y: 220 }, { x: 350, y: 210 }
  ];
  return Array.from({ length: BOT_COUNT }, (_, index) => ({
    id: `bot-${index}`,
    name: names[index],
    x: WORLD_WIDTH / 2 + positions[index].x,
    y: WORLD_HEIGHT / 2 + positions[index].y,
    radius: 24 + index * 2,
    score: index * 15,
    color: colors[index],
    alive: true,
    respawnAt: 0,
    velocity: { x: 0, y: 0 }
  }));
}

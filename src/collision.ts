import type { CityObject, Hole } from './types';

export function canAbsorb(hole: Hole, object: CityObject): boolean {
  return hole.alive && object.active && object.radius <= hole.radius * 0.72;
}

export function overlapsForAbsorption(hole: Hole, object: CityObject): boolean {
  return Math.hypot(hole.x - object.x, hole.y - object.y) < hole.radius * 0.72;
}

export function growHole(hole: Hole, points: number): void {
  hole.score += points;
  hole.radius = Math.min(88, hole.radius + Math.max(0.35, points * 0.035));
}

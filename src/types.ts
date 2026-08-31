export type Vec2 = { x: number; y: number };

export type ObjectKind = 'tree' | 'lamp' | 'crate' | 'car' | 'hydrant' | 'bench' | 'trash';

export interface CityObject extends Vec2 {
  id: number;
  kind: ObjectKind;
  radius: number;
  points: number;
  color: string;
  rotation: number;
  active: boolean;
  respawnAt: number;
}

export interface Hole extends Vec2 {
  id: string;
  name: string;
  radius: number;
  score: number;
  color: string;
  alive: boolean;
  respawnAt: number;
  velocity: Vec2;
}

export interface AbsorptionEffect extends Vec2 {
  kind: ObjectKind;
  color: string;
  radius: number;
  from: Vec2;
  to: Vec2;
  age: number;
  duration: number;
}

export interface RingEffect extends Vec2 {
  age: number;
  duration: number;
  color: string;
  startRadius: number;
}

export interface Camera extends Vec2 {
  viewportWidth: number;
  viewportHeight: number;
}

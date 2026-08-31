import { describe, expect, it } from 'vitest';
import { canAbsorb, growHole, overlapsForAbsorption } from './collision';
import { createPlayer, generateObjects } from './world';
import { overlapsBuilding } from './cityLayout';

describe('deterministic city world', () => {
  it('creates a dense and repeatable world', () => {
    const first = generateObjects(42);
    const second = generateObjects(42);
    expect(first).toHaveLength(220);
    expect(first).toEqual(second);
    const central = first.filter((object) => Math.abs(object.x - 1200) < 650 && Math.abs(object.y - 900) < 450);
    expect(central.length).toBeGreaterThanOrEqual(40);
  });

  it('never places city objects inside buildings', () => {
    for (const object of generateObjects()) {
      expect(overlapsBuilding(object.x, object.y, object.radius)).toBe(false);
    }
  });
});

describe('absorption rules', () => {
  it('absorbs only objects small enough and within the hole center', () => {
    const player = createPlayer();
    const small = { ...generateObjects()[0], x: player.x + 3, y: player.y, radius: 8 };
    const large = { ...small, radius: 25 };
    expect(canAbsorb(player, small)).toBe(true);
    expect(overlapsForAbsorption(player, small)).toBe(true);
    expect(canAbsorb(player, large)).toBe(false);
  });

  it('adds points and grows the hole', () => {
    const player = createPlayer();
    growHole(player, 20);
    expect(player.score).toBe(20);
    expect(player.radius).toBeGreaterThan(27);
  });
});

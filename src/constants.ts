export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;
export const ROUND_DURATION = 120;
export const PLAYER_START_RADIUS = 27;
export const BOT_COUNT = 4;

export const OBJECT_META = {
  tree: { radius: 16, points: 18, color: '#3fc477' },
  lamp: { radius: 8, points: 8, color: '#ffe079' },
  crate: { radius: 11, points: 12, color: '#cc8645' },
  car: { radius: 24, points: 35, color: '#ff6b72' },
  hydrant: { radius: 7, points: 7, color: '#ff544f' },
  bench: { radius: 14, points: 14, color: '#ad7754' },
  trash: { radius: 9, points: 9, color: '#73909a' }
} as const;

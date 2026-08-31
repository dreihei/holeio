import { WORLD_HEIGHT, WORLD_WIDTH } from './constants';

export const ROAD_WIDTH = 118;
export const ROADS_X = [300, 800, 1200, 1600, 2100] as const;
export const ROADS_Y = [300, 680, 1100, 1500] as const;
export const BUILDING_DEPTH = 11;

export interface BuildingLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  variant: number;
}

function createGreenBands(limit: number, roads: readonly number[]): Array<{ start: number; end: number }> {
  const bands: Array<{ start: number; end: number }> = [];
  const roadAndWalkHalf = ROAD_WIDTH / 2 + 18;
  let start = 14;
  for (const road of roads) {
    const end = road - roadAndWalkHalf - 10;
    if (end - start >= 150) bands.push({ start, end });
    start = road + roadAndWalkHalf + 10;
  }
  if (limit - 14 - start >= 150) bands.push({ start, end: limit - 14 });
  return bands;
}

function createBuildings(): BuildingLayout[] {
  const buildings: BuildingLayout[] = [];
  const columns = createGreenBands(WORLD_WIDTH, ROADS_X);
  const rows = createGreenBands(WORLD_HEIGHT, ROADS_Y);
  columns.forEach((column, col) => {
    rows.forEach((row, rowIndex) => {
      const plotWidth = column.end - column.start;
      const plotHeight = row.end - row.start;
      const margin = 15;
      const width = Math.min(plotWidth - margin * 2 - BUILDING_DEPTH, 185 + (col * 29 + rowIndex * 17) % 95);
      const height = Math.min(plotHeight - margin * 2 - BUILDING_DEPTH, 118 + (rowIndex * 23 + col * 11) % 70);
      const spareX = Math.max(0, plotWidth - margin * 2 - BUILDING_DEPTH - width);
      const spareY = Math.max(0, plotHeight - margin * 2 - BUILDING_DEPTH - height);
      buildings.push({
        x: column.start + margin + ((col * 37 + rowIndex * 19) % Math.max(1, Math.floor(spareX + 1))),
        y: row.start + margin + ((col * 13 + rowIndex * 31) % Math.max(1, Math.floor(spareY + 1))),
        width,
        height,
        depth: BUILDING_DEPTH,
        variant: col + rowIndex
      });
    });
  });
  return buildings;
}

export const BUILDINGS = createBuildings();

export function overlapsBuilding(x: number, y: number, radius: number, padding = 5): boolean {
  const clearance = radius + padding;
  return BUILDINGS.some((building) => (
    x >= building.x - clearance
    && x <= building.x + building.width + building.depth + clearance
    && y >= building.y - clearance
    && y <= building.y + building.height + building.depth + clearance
  ));
}

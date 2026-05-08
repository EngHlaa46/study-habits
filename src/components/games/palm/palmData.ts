export type PalmAnimationState =
  | "idle"
  | "sway"
  | "glow"
  | "wilt"
  | "waterDrip"
  | "flicker"
  | "dateBurst";

export interface StageConfig {
  trunkSegments: number;
  frondCount: number;
  frondScale: number;
  hasDates: boolean;
  dateSize: number;   // radius of each date dot
  dateClusters: number;
  legendary: boolean;
}

// viewBox: 0 0 80 130 — ground at y=115, each trunk segment 7px tall, 10px wide
export const STAGE_CONFIGS: StageConfig[] = [
  { trunkSegments: 0,  frondCount: 2, frondScale: 0.45, hasDates: false, dateSize: 0, dateClusters: 0, legendary: false },
  { trunkSegments: 3,  frondCount: 3, frondScale: 0.60, hasDates: false, dateSize: 0, dateClusters: 0, legendary: false },
  { trunkSegments: 5,  frondCount: 4, frondScale: 0.75, hasDates: false, dateSize: 0, dateClusters: 0, legendary: false },
  { trunkSegments: 7,  frondCount: 5, frondScale: 0.88, hasDates: true,  dateSize: 2, dateClusters: 3, legendary: false },
  { trunkSegments: 9,  frondCount: 6, frondScale: 1.00, hasDates: true,  dateSize: 2.5, dateClusters: 4, legendary: false },
  { trunkSegments: 11, frondCount: 6, frondScale: 1.08, hasDates: true,  dateSize: 3,   dateClusters: 5, legendary: true  },
];

// Frond angles (degrees from vertical, neg = left, pos = right)
export const FROND_ANGLES: Record<number, number[]> = {
  2: [-38, 38],
  3: [-52, 0, 52],
  4: [-64, -22, 22, 64],
  5: [-72, -38, 0, 38, 72],
  6: [-78, -48, -16, 16, 48, 78],
  7: [-82, -55, -27, 0, 27, 55, 82],
};

// Date cluster offsets around the crown (x, y from crown center)
export const DATE_CLUSTER_OFFSETS = [
  { x: -8, y: 4 },
  { x: 8,  y: 4 },
  { x: -4, y: 10 },
  { x: 4,  y: 10 },
  { x: 0,  y: 7  },
];

export const TRUNK_SEGMENT_H = 7;
export const TRUNK_W = 10;
export const GROUND_Y = 115;
export const TRUNK_X = 40; // center x

export function getCrownY(segments: number): number {
  return GROUND_Y - segments * TRUNK_SEGMENT_H - (segments === 0 ? 8 : 0);
}

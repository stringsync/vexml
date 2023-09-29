export type Config = {
  defaultSystemDistance: number;
  defaultStaffDistance: number;
  measureSpacingBuffer: number;
  multiMeasureRestWidth: number;
};

export const DEFAULT_CONFIG: Config = {
  defaultSystemDistance: 80,
  defaultStaffDistance: 80,
  measureSpacingBuffer: 100,
  multiMeasureRestWidth: 200,
} as const;

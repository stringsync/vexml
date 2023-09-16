export type Config = {
  defaultSystemDistance: number;
  defaultStaffDistance: number;
  measureSpacingBuffer: number;
};

export const DEFAULT_CONFIG: Config = {
  defaultSystemDistance: 80,
  defaultStaffDistance: 80,
  measureSpacingBuffer: 100,
} as const;

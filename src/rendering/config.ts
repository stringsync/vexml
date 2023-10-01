export type Config = {
  defaultSystemDistance: number;
  defaultStaffDistance: number;
  measurePadding: number;
  multiMeasureRestWidth: number;
};

export const DEFAULT_CONFIG: Config = {
  defaultSystemDistance: 80,
  defaultStaffDistance: 80,
  measurePadding: 80,
  multiMeasureRestWidth: 200,
} as const;

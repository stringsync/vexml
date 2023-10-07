export type Config = {
  defaultSystemDistance: number;
  defaultStaveDistance: number;
  titleTopPadding: number;
  titleFontFamily: string;
  titleFontSize: string;
  voicePadding: number;
  measureNumberFontSize: string;
  multiMeasureRestWidth: number;
};

export const DEFAULT_CONFIG: Config = {
  defaultSystemDistance: 80,
  defaultStaveDistance: 80,
  titleTopPadding: 40,
  titleFontFamily: 'Arial',
  titleFontSize: '36px',
  voicePadding: 80,
  measureNumberFontSize: '10px',
  multiMeasureRestWidth: 200,
} as const;

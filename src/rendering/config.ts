export type Config = {
  DEFAULT_SYSTEM_DISTANCE: number;
  DEFAULT_STAVE_DISTANCE: number;
  TITLE_TOP_PADDING: number;
  TITLE_FONT_FAMILY: string;
  TITLE_FONT_SIZE: string;
  REHEARSAL_FONT_FAMILY: string;
  REHEARSAL_FONT_SIZE: string;
  PART_NAME_FONT_SIZE: string;
  PART_NAME_FONT_FAMILY: string;
  PART_DISTANCE: number;
  VOICE_PADDING: number;
  MULTI_MEASURE_REST_WIDTH: number;
  ENABLE_MEASURE_NUMBERS: boolean;
};

export const DEFAULT_CONFIG: Config = {
  DEFAULT_SYSTEM_DISTANCE: 80,
  DEFAULT_STAVE_DISTANCE: 140,
  TITLE_TOP_PADDING: 40,
  TITLE_FONT_FAMILY: 'Arial',
  TITLE_FONT_SIZE: '36px',
  REHEARSAL_FONT_FAMILY: 'Times New Roman',
  REHEARSAL_FONT_SIZE: '16px',
  PART_NAME_FONT_FAMILY: 'Arial',
  PART_NAME_FONT_SIZE: '13px',
  PART_DISTANCE: 80,
  VOICE_PADDING: 80,
  MULTI_MEASURE_REST_WIDTH: 200,
  ENABLE_MEASURE_NUMBERS: true,
} as const;

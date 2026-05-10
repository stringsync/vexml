import * as schema from './schema';
import { t } from './schema';

export type Config = schema.SchemaConfig<typeof CONFIG>;

export const CONFIG = {
  DRAWING_BACKEND: t.enum({
    defaultValue: 'svg',
    help: 'DRAWING_BACKEND specifies the rendering backend to use.',
    choices: ['svg', 'canvas'] as const,
  }),
  WIDTH: t.number({
    defaultValue: null,
    help: 'WIDTH specifies the width of the rendered score.',
  }),
  HEIGHT: t.number({
    defaultValue: null,
    help: 'HEIGHT specifies the maximum height of the rendered score.',
  }),
  INPUT_TYPE: t.enum({
    defaultValue: 'auto',
    help: 'INPUT_TYPE specifies the type of input to use.',
    choices: ['auto', 'mouse', 'touch', 'hybrid', 'none'] as const,
  }),
  DEFAULT_PLAYBACK_BPM: t.number({
    defaultValue: 100,
    help:
      'DEFAULT_PLAYBACK_BPM is the default beats per minute value used for playback. ' +
      'It can get overridden by metronomes specified in the original document.',
  }),
  SCORE_PADDING_TOP: t.number({
    defaultValue: 40,
    help: 'TOP_PADDING is the vertical distance from the top of the rendering.',
  }),
  SCORE_PADDING_BOTTOM: t.number({
    defaultValue: 40,
    help: 'SCORE_PADDING_BOTTOM is the vertical distance from the bottom of the rendering.',
  }),
  TITLE_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'TITLE_FONT_FAMILY is the font family for the title.',
  }),
  TITLE_FONT_SIZE: t.string({
    defaultValue: '36px',
    help: 'TITLE_FONT_SIZE is the font size for the title expressed in browser-compatible units.',
  }),
  TITLE_FONT_LINE_HEIGHT_PX: t.number({
    defaultValue: 40,
    help: 'TITLE_FONT_LINE_HEIGHT is the line height for the title in pixels',
  }),
  TITLE_PADDING_BOTTOM: t.number({
    defaultValue: 20,
    help: 'TITLE_BOTTOM_PADDING is the vertical distance from the title to the first system.',
  }),
  SYSTEM_MARGIN_BOTTOM: t.number({
    defaultValue: 40,
    help: 'SYSTEM_MARGIN_BOTTOM is the vertical distance between systems',
  }),
  LAST_SYSTEM_WIDTH_STRETCH_THRESHOLD: t.number({
    defaultValue: 0.75,
    help:
      'LAST_SYSTEM_WIDTH_STRETCH_THRESHOLD is the total width fraction that the measures must exceed to stretch the ' +
      'measures in the last system.',
  }),
  CONTINUATION_MEASURE_WIDTH_THRESHOLD: t.number({
    defaultValue: null,
    help:
      'CONTINUATION_MEASURE_WIDTH_THRESHOLD is the calculated measure width (in pixels) above which an eligible ' +
      'measure is split into continuation pieces. Pieces flow across systems via the normal bin-packer, with the ' +
      'inner pieces having no start or end barlines as the continuation cue. Only supported by DefaultFormatter ' +
      '(requires WIDTH to be set). When this is null, no fragmentation occurs.',
  }),
  PART_LABEL_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'PART_LABEL_FONT_FAMILY is the font family for part names.',
  }),
  PART_LABEL_FONT_SIZE: t.string({
    defaultValue: '13px',
    help: 'PART_LABEL_FONT_SIZE is the font size for part names expressed in browser-compatible units.',
  }),
  PART_LABEL_PADDING_RIGHT: t.number({
    defaultValue: 8,
    help: 'PART_LABEL_PADDING_RIGHT is the horizontal distance from part labels to the first measure.',
  }),
  PART_LABEL_ALIGNMENT: t.enum({
    defaultValue: 'right',
    help: 'PART_LABEL_ALIGNMENT is the horizontal alignment of part labels.',
    choices: ['right', 'left'] as const,
  }),
  PART_MARGIN_BOTTOM: t.number({
    defaultValue: 40,
    help:
      'PART_MARGIN_BOTTOM is the vertical distance between parts of a system.' +
      "It won't have an effect if there is only one part.",
  }),
  DEFAULT_STAVE_MARGIN_BOTTOM: t.number({
    defaultValue: 40,
    help:
      'DEFAULT_STAVE_MARGIN_BOTTOM is the margin between staves within the same part and system. ' +
      "It won't have an effect if there is only one stave per part.",
  }),
  BASE_VOICE_WIDTH: t.number({
    defaultValue: 80,
    help: 'BASE_VOICE_WIDTH is how much extra width to give voices when calculating stave minimum width.',
  }),
  BASE_MULTI_REST_MEASURE_WIDTH: t.number({
    defaultValue: 150,
    help:
      'MULTI_REST_MEASURE_WIDTH is how much extra width to give multi-rest measures ' +
      'when calculating stave minimum width.',
  }),
  SHOW_TAB_CLEF: t.boolean({
    defaultValue: true,
    help: 'SHOW_TAB_CLEF specifies whether to show the tab clef.',
  }),
  SHOW_TAB_TIME_SIGNATURE: t.boolean({
    defaultValue: false,
    help: 'SHOW_TAB_TIME_SIGNATURE specifies whether to show the time signature for tab staves.',
  }),
  SHOW_TAB_STEMS: t.boolean({
    defaultValue: false,
    help: 'SHOW_TAB_STEMS specifies whether to show stems for tab staves.',
  }),
  MEASURE_LABELING_SCHEME: t.enum({
    choices: ['all', 'every2', 'every3', 'system', 'none'] as const,
    defaultValue: 'all',
    help: 'MEASURE_LABELING_SCHEME is the scheme for showing measure labels.',
  }),
  CHORD_SYMBOL_FONT_FAMILY: t.string({
    defaultValue: 'Roboto Slab, Times, Bravura, serif',
    help:
      'CHORD_SYMBOL_FONT_FAMILY is the font family used to render chord symbols above the staff. ' +
      'Should include Bravura (or another SMuFL music font) as a fallback so accidental and chord-quality glyphs render.',
  }),
  CHORD_SYMBOL_FONT_SIZE: t.number({
    defaultValue: 12,
    help: 'CHORD_SYMBOL_FONT_SIZE is the font size in points used to render chord symbols above the staff.',
  }),
  CHORD_SYMBOL_FONT_WEIGHT: t.string({
    defaultValue: 'normal',
    help: 'CHORD_SYMBOL_FONT_WEIGHT is the font weight used to render chord symbols above the staff.',
  }),
  DEFAULT_GAP_OVERLAY_FONT_SIZE: t.string({
    defaultValue: '12px',
    help: 'DEFAULT_GAP_OVERLAY_FONT_SIZE is the font size for gap overlays.',
  }),
  DEFAULT_GAP_OVERLAY_FONT_FAMILY: t.string({
    defaultValue: 'Arial',
    help: 'DEFAULT_GAP_OVERLAY_FONT_FAMILY is the font family for gap overlays.',
  }),
  DEFAULT_GAP_OVERLAY_FONT_COLOR: t.string({
    defaultValue: 'black',
    help: 'DEFAULT_GAP_OVERLAY_FONT_COLOR is the font color for gap overlays.',
  }),
  DEFAULT_GAP_OVERLAY_FILL_COLOR: t.string({
    defaultValue: 'rgba(255, 255, 255, 0.95)',
    help: 'DEFAULT_GAP_OVERLAY_FILL_COLOR is the fill color for gap overlays.',
  }),
  DEBUG_DRAW_SYSTEM_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_SYSTEM_RECTS enables drawing of system rectangles for debugging purposes',
  }),
  DEBUG_DRAW_MEASURE_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_MEASURE_RECTS enables drawing of measure rectangles for debugging purposes.',
  }),
  DEBUG_DRAW_FRAGMENT_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_FRAGMENT_RECTS enables drawing of fragment rectangles for debugging purposes.',
  }),
  DEBUG_DRAW_PART_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_PART_RECTS enables drawing of part rectangles for debugging purposes.',
  }),
  DEBUG_DRAW_STAVE_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_STAVE_RECTS enables drawing of stave rectangles for debugging purposes.',
  }),
  DEBUG_DRAW_STAVE_INTRINSIC_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_STAVE_INTRINSIC_RECTS enables drawing of stave intrinsic rectangles for debugging purposes.',
  }),
  DEBUG_DRAW_STAVE_PLAYABLE_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_STAVE_PLAYABLE_RECTS enables drawing of stave playable rectangles for debugging purposes.',
  }),
  DEBUG_DRAW_VOICE_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_VOICE_RECTS enables drawing of voice rectangles for debugging purposes.',
  }),
  DEBUG_DRAW_VOICE_ENTRY_RECTS: t.boolean({
    defaultValue: false,
    help: 'DEBUG_DRAW_VOICE_ENTRY_RECTS enables drawing of voice entry rectangles for debugging purposes.',
  }),
};

export const DEFAULT_CONFIG = t.defaultConfig(CONFIG);

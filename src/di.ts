/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { AttributesHandler } from './producers/attributeshandler';
import { PrintHandler } from './producers/printhandler';
import { BarlineHandler } from './producers/barlinehandler';
import { BeamHandler } from './producers/beamhandler';
import { DirectionHandler } from './producers/directionhandler';
import { LyricHandler } from './producers/lyrichandler';
import { MeasureHandler } from './producers/measurehandler';
import { NotationsHandler } from './producers/notationshandler';
import { NoteHandler } from './producers/notehandler';
import { VexmlConfig } from './types';

export const DEFAULT_CONFIG: VexmlConfig = Object.freeze({
  DEFAULT_MEASURE_WIDTH_PX: 100,
  DEFAULT_MEASURE_NUM_STAVES: 0,
  DEFAULT_PART_ID: 'NN',
  DEFAULT_STEP_VALUE: '',
  DEFAULT_OCTAVE_VALUE: '',
  DEFAULT_STEM_VALUE: null,
  DEFAULT_ACCIDENTAL_VALUE: '',
  DEFAULT_ACCIDENTAL_CAUTIONARY: false,
  DEFAULT_NOTEHEAD_VALUE: 'normal',
  DEFAULT_NOTE_DURATION: 4,
  DEFAULT_STAFF_NUMBER: 1,
  DEFAULT_CLEF_SIGN: 'G',
  DEFAULT_STAFF_LINE: 2,
  DEFAULT_BEATS: 4,
  DEFAULT_BEAT_TYPE: 4,
  DEFAULT_FIFTHS: 0,
  DEFAULT_SYLLABIC: 'single',
});

/**
 * Creates a dependency injection container.
 */
export const createContainer = (opts?: { config: Partial<VexmlConfig> }) => {
  const config = { ...DEFAULT_CONFIG, ...opts?.config };

  const attributesHandler = new AttributesHandler({
    config,
  });
  const printHandler = new PrintHandler();

  const directionHandler = new DirectionHandler();

  const notationsHandler = new NotationsHandler();

  const barlineHandler = new BarlineHandler();

  const lyricHandler = new LyricHandler({
    config,
  });

  const beamHandler = new BeamHandler();

  const noteHandler = new NoteHandler({
    config,
    beamHandler,
    lyricHandler,
    notationsHandler,
  });

  const measureHandler = new MeasureHandler({
    config,
    attributesHandler,
    printHandler,
    barlineHandler,
    directionHandler,
    noteHandler,
  });

  return {
    config,
    attributesHandler,
    barlineHandler,
    directionHandler,
    noteHandler,
    measureHandler,
    lyricHandler,
    beamHandler,
    notationsHandler,
  } as const;
};

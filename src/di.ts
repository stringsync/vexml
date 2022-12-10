/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { AttributesHandler } from './producers/attributeshandler';
import { BarlineHandler } from './producers/barlinehandler';
import { BeamHandler } from './producers/beamhandler';
import { LyricHandler } from './producers/lyrichandler';
import { MeasureHandler } from './producers/measurehandler';
import { NotationsHandler } from './producers/notationshandler';
import { NoteHandler } from './producers/notehandler';
import { PartHandler } from './producers/parthandler';
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
  DEFAULT_BEATS: '4',
  DEFAULT_BEAT_TYPE: '4',
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
    barlineHandler,
    noteHandler,
  });

  const partHandler = new PartHandler({
    config,
    measureHandler,
  });

  return {
    config,
    attributesHandler,
    barlineHandler,
    noteHandler,
    measureHandler,
    partHandler,
    lyricHandler,
    beamHandler,
    notationsHandler,
  } as const;
};

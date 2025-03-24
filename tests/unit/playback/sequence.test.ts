import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { PlaybackElement, Sequence, SequenceTransition, SequenceTransitionType } from '@/playback';
import { NoopLogger } from '@/debug';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(Sequence, () => {
  const logger = new NoopLogger();

  it('creates for: single measure, single stave, different notes', () => {
    const score = render('playback_simple.musicxml');
    const elements = score
      .getMeasures()
      .flatMap((measure) => measure.getFragments())
      .flatMap((fragment) => fragment.getParts())
      .flatMap((part) => part.getStaves())
      .flatMap((stave) => stave.getVoices())
      .flatMap((voice) => voice.getEntries());

    const sequences = Sequence.create(logger, score);
    const sequence = sequences[0];
    const events = sequence.getEvents();

    expect(elements).toHaveLength(4);
    expect(sequences).toHaveLength(1);
    // TODO: Uncomment when we have a proper implementation.
    // expect(events).toHaveLength(5);
    // expect(events[0]).toIncludeAllTransitions([start(elements[0])]);
    // expect(events[1]).toIncludeAllTransitions([stop(elements[0]), start(elements[1])]);
    // expect(events[2]).toIncludeAllTransitions([stop(elements[1]), start(elements[2])]);
    // expect(events[3]).toIncludeAllTransitions([stop(elements[2]), start(elements[3])]);
    // expect(events[4]).toIncludeAllTransitions([stop(elements[3])]);
  });

  it('creates for: single measure, single stave, same notes', () => {
    const score = render('playback_same_note.musicxml');
    const elements = score
      .getMeasures()
      .flatMap((measure) => measure.getFragments())
      .flatMap((fragment) => fragment.getParts())
      .flatMap((part) => part.getStaves())
      .flatMap((stave) => stave.getVoices())
      .flatMap((voice) => voice.getEntries());

    const sequences = Sequence.create(logger, score);
    const sequence = sequences[0];
    const events = sequence.getEvents();

    expect(elements).toHaveLength(4);
    expect(sequences).toHaveLength(1);
    // TODO: Uncomment when we have a proper implementation.
    // expect(events).toHaveLength(5);
    // expect(events[0]).toIncludeAllTransitions([start(elements[0])]);
    // expect(events[1]).toIncludeAllTransitions([stop(elements[0]), start(elements[1])]);
    // expect(events[2]).toIncludeAllTransitions([stop(elements[1]), start(elements[2])]);
    // expect(events[3]).toIncludeAllTransitions([stop(elements[2]), start(elements[3])]);
    // expect(events[4]).toIncludeAllTransitions([stop(elements[3])]);
  });

  it('creates for: single measure, multiple staves, different notes', () => {
    const score = render('playback_multi_stave.musicxml');

    const sequences = Sequence.create(logger, score);

    expect(sequences).toHaveLength(1);
  });

  it('creates for: single measure, multiple staves, multiple parts', () => {
    const score = render('playback_multi_part.musicxml');

    const sequences = Sequence.create(logger, score);

    expect(sequences).toHaveLength(1);
  });

  it('creates for: multiple measures, single stave, different notes', () => {
    const score = render('playback_multi_measure.musicxml');

    const sequences = Sequence.create(logger, score);

    expect(sequences).toHaveLength(1);
  });

  it('creates for: single measure, single stave, repeat', () => {
    const score = render('playback_repeat.musicxml');

    const sequences = Sequence.create(logger, score);

    expect(sequences).toHaveLength(1);
  });

  it('creates for: multiple measures, single stave, repeat with endings', () => {
    const score = render('playback_repeat_endings.musicxml');

    const sequences = Sequence.create(logger, score);

    expect(sequences).toHaveLength(1);
  });

  it('creates for: multiple measures, single stave, multiple systems', () => {
    const score = render('playback_multi_system.musicxml');

    const sequences = Sequence.create(logger, score);

    expect(sequences).toHaveLength(1);
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toIncludeAllTransitions(expected: SequenceTransition[]): R;
    }
  }
}

expect.extend({
  toIncludeAllTransitions(received: any, expected: SequenceTransition[]) {
    try {
      expect(received.transitions).toIncludeAllMembers(expected);
      return {
        pass: true,
        message: () => 'expected objects not to match',
      };
    } catch (error) {
      return {
        pass: false,
        message: () => (error instanceof Error ? error.message : 'Object mismatch'),
      };
    }
  },
});

function render(filename: string) {
  const musicXMLPath = path.resolve(DATA_DIR, filename);
  const musicXML = fs.readFileSync(musicXMLPath).toString();
  const div = document.createElement('div');
  return vexml.renderMusicXML(musicXML, div, {
    config: {
      WIDTH: 900,
    },
  });
}

function start(element: PlaybackElement) {
  return { type: SequenceTransitionType.Start, element };
}

function stop(element: PlaybackElement) {
  return { type: SequenceTransitionType.Stop, element };
}

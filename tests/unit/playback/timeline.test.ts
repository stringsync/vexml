import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { TransitionEvent, JumpEvent, PlaybackElement, SystemEndEvent, Timeline, TimelineEvent } from '@/playback';
import { NoopLogger } from '@/debug';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(Timeline, () => {
  const logger = new NoopLogger();

  it.only('creates for: single measure, single stave, different notes', () => {
    const score = render('playback_simple.musicxml');
    const elements = score
      .getMeasures()
      .flatMap((measure) => measure.getFragments())
      .flatMap((fragment) => fragment.getParts())
      .flatMap((part) => part.getStaves())
      .flatMap((stave) => stave.getVoices())
      .flatMap((voice) => voice.getEntries());
    const describe = Describer.from(elements).describe;

    const timelines = Timeline.create(logger, score);
    const timeline = timelines[0];
    const events = timeline.getEvents();

    expect(elements).toHaveLength(4);
    expect(timelines).toHaveLength(1);
    expect(describe(events[0])).toBe('[0ms] transition -> start(0)');
    expect(describe(events[1])).toBe('[600ms] transition -> stop(0), start(1)');
    expect(describe(events[2])).toBe('[1200ms] transition -> stop(1), start(2)');
    expect(describe(events[3])).toBe('[1800ms] transition -> stop(2), start(3)');
    expect(describe(events[4])).toBe('[2400ms] transition -> stop(3)');
    expect(describe(events[5])).toBe('[2400ms] systemend');
    expect(describe(events[6])).toBe('undefined');
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

    const timelines = Timeline.create(logger, score);
    const timeline = timelines[0];
    const events = timeline.getEvents();

    expect(elements).toHaveLength(4);
    expect(timelines).toHaveLength(1);
    // TODO: Uncomment when we have a proper implementation.
    // expect(events).toHaveLength(5);
    // expect(events[0].transitions).toIncludeAllMembers([start(elements[0])]);
    // expect(events[1].transitions).toIncludeAllMembers([stop(elements[0]), start(elements[1])]);
    // expect(events[2].transitions).toIncludeAllMembers([stop(elements[1]), start(elements[2])]);
    // expect(events[3].transitions).toIncludeAllMembers([stop(elements[2]), start(elements[3])]);
    // expect(events[4].transitions).toIncludeAllMembers([stop(elements[3])]);
  });

  it('creates for: single measure, multiple staves, different notes', () => {
    const score = render('playback_multi_stave.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
  });

  it('creates for: single measure, multiple staves, multiple parts', () => {
    const score = render('playback_multi_part.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(2);
  });

  it('creates for: multiple measures, single stave, different notes', () => {
    const score = render('playback_multi_measure.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
  });

  it('creates for: single measure, single stave, repeat', () => {
    const score = render('playback_repeat.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
  });

  it('creates for: multiple measures, single stave, repeat with endings', () => {
    const score = render('playback_repeat_endings.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
  });

  it('creates for: multiple measures, single stave, multiple systems', () => {
    const score = render('playback_multi_system.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
  });
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

/**
 * A helper class to describe playback events.
 *
 * This is done to make debugging failing tests easier. Otherwise,
 */
class Describer {
  private constructor(private elements: Map<PlaybackElement, number>) {}

  static from(elements: PlaybackElement[]) {
    const map = new Map<PlaybackElement, number>();
    elements.forEach((element, index) => {
      map.set(element, index);
    });
    return new Describer(map);
  }

  describe = (event: TimelineEvent | undefined): string => {
    switch (event?.type) {
      case 'transition':
        return this.describeTransition(event);
      case 'jump':
        return this.describeJump(event);
      case 'systemend':
        return this.describeSystemEnd(event);
      default:
        return 'undefined';
    }
  };

  private describeTransition(event: TransitionEvent): string {
    const transitions = event.transitions.map((t) => `${t.type}(${this.elements.get(t.element)})`).join(', ');
    return `[${event.time.ms}ms] transition -> ${transitions}`;
  }
  private describeJump(event: JumpEvent): string {
    return `[${event.time.ms}ms] jump`;
  }
  private describeSystemEnd(event: SystemEndEvent): string {
    return `[${event.time.ms}ms] systemend`;
  }
}

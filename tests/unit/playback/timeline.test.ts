import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { TransitionEvent, JumpEvent, PlaybackElement, SystemEndEvent, Timeline, TimelineEvent } from '@/playback';
import { NoopLogger } from '@/debug';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(Timeline, () => {
  const logger = new NoopLogger();

  it('creates for: single measure, single stave, different notes', () => {
    const score = render('playback_simple.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(stringify({ score, partIndex: 0, timeline: timelines[0] })).toEqual([
      // stave0: 0 1 2 3
      '[0ms] transition -> start(0)',
      '[600ms] transition -> stop(0), start(1)',
      '[1200ms] transition -> stop(1), start(2)',
      '[1800ms] transition -> stop(2), start(3)',
      '[2400ms] transition -> stop(3)',
      '[2400ms] systemend',
    ]);
  });

  it('creates for: single measure, single stave, same notes', () => {
    const score = render('playback_same_note.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(stringify({ score, partIndex: 0, timeline: timelines[0] })).toEqual([
      // stave0: 0 1 2 3
      '[0ms] transition -> start(0)',
      '[600ms] transition -> stop(0), start(1)',
      '[1200ms] transition -> stop(1), start(2)',
      '[1800ms] transition -> stop(2), start(3)',
      '[2400ms] transition -> stop(3)',
      '[2400ms] systemend',
    ]);
  });

  it('creates for: single measure, multiple staves, different notes', () => {
    const score = render('playback_multi_stave.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(stringify({ score, partIndex: 0, timeline: timelines[0] })).toEqual([
      // stave0: 0   1   2   3
      // stave1: 4 5 6 7 8 9 10 11
      '[0ms] transition -> start(0), start(4)',
      '[300ms] transition -> stop(4), start(5)',
      '[600ms] transition -> stop(0), stop(5), start(1), start(6)',
      '[900ms] transition -> stop(6), start(7)',
      '[1200ms] transition -> stop(1), stop(7), start(2), start(8)',
      '[1500ms] transition -> stop(8), start(9)',
      '[1800ms] transition -> stop(2), stop(9), start(3), start(10)',
      '[2100ms] transition -> stop(10), start(11)',
      '[2400ms] transition -> stop(3), stop(11)',
      '[2400ms] systemend',
    ]);
  });

  it('creates for: single measure, multiple staves, multiple parts', () => {
    const score = render('playback_multi_part.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(2);
    expect(stringify({ score, partIndex: 0, timeline: timelines[0] })).toEqual([
      // stave0: 0 1 2 3
      '[0ms] transition -> start(0)',
      '[600ms] transition -> stop(0), start(1)',
      '[1200ms] transition -> stop(1), start(2)',
      '[1800ms] transition -> stop(2), start(3)',
      '[2400ms] transition -> stop(3)',
      '[2400ms] systemend',
    ]);
    expect(stringify({ score, partIndex: 1, timeline: timelines[1] })).toEqual([
      // stave0: 0 1 2 3
      // stave1: 4 5 6 7
      '[0ms] transition -> start(0), start(4)',
      '[600ms] transition -> stop(0), stop(4), start(1), start(5)',
      '[1200ms] transition -> stop(1), stop(5), start(2), start(6)',
      '[1800ms] transition -> stop(2), stop(6), start(3), start(7)',
      '[2400ms] transition -> stop(3), stop(7)',
      '[2400ms] systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, different notes', () => {
    const score = render('playback_multi_measure.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(stringify({ score, partIndex: 0, timeline: timelines[0] })).toEqual([
      // stave0: 0 1 2 3 4 | 5 6 7 8
      '[0ms] transition -> start(0)',
      '[600ms] transition -> stop(0), start(1)',
      '[1200ms] transition -> stop(1), start(2)',
      '[1800ms] transition -> stop(2), start(3)',
      '[2400ms] transition -> stop(3), start(4)',
      '[3000ms] transition -> stop(4), start(5)',
      '[3600ms] transition -> stop(5), start(6)',
      '[4200ms] transition -> stop(6), start(7)',
      '[4800ms] transition -> stop(7)',
      '[4800ms] systemend',
    ]);
  });

  it('creates for: single measure, single stave, repeat', () => {
    const score = render('playback_repeat.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(stringify({ score, partIndex: 0, timeline: timelines[0] })).toEqual([
      // stave0: 0 1 2 3 :||
      '[0ms] transition -> start(0)',
      '[600ms] transition -> stop(0), start(1)',
      '[1200ms] transition -> stop(1), start(2)',
      '[1800ms] transition -> stop(2), start(3)',
      '[2400ms] jump',
      '[2400ms] transition -> stop(3), start(0)',
      '[3000ms] transition -> stop(0), start(1)',
      '[3600ms] transition -> stop(1), start(2)',
      '[4200ms] transition -> stop(2), start(3)',
      '[4800ms] transition -> stop(3)',
      '[4800ms] systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, repeat with endings', () => {
    const score = render('playback_repeat_endings.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(stringify({ score, partIndex: 0, timeline: timelines[0] })).toEqual([
      // stave0: 0 1 2 3 | [ending1 -> 4 5 6 7] :|| [ending2 -> 8 9 10 11] | 12 13 14 15
      '[0ms] transition -> start(0)',
      '[600ms] transition -> stop(0), start(1)',
      '[1200ms] transition -> stop(1), start(2)',
      '[1800ms] transition -> stop(2), start(3)',
      '[2400ms] transition -> stop(3), start(4)',
      '[3000ms] transition -> stop(4), start(5)',
      '[3600ms] transition -> stop(5), start(6)',
      '[4200ms] transition -> stop(6), start(7)',
      '[4800ms] jump',
      '[4800ms] transition -> stop(7), start(0)',
      '[5400ms] transition -> stop(0), start(1)',
      '[6000ms] transition -> stop(1), start(2)',
      '[6600ms] transition -> stop(2), start(3)',
      '[7200ms] jump',
      '[7200ms] transition -> stop(3), start(8)',
      '[7800ms] transition -> stop(8), start(9)',
      '[8400ms] transition -> stop(9), start(10)',
      '[9000ms] transition -> stop(10), start(11)',
      '[9600ms] transition -> stop(11), start(12)',
      '[10200ms] transition -> stop(12), start(13)',
      '[10800ms] transition -> stop(13), start(14)',
      '[11400ms] transition -> stop(14), start(15)',
      '[12000ms] transition -> stop(15)',
      '[12000ms] systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, multiple systems', () => {
    const score = render('playback_multi_system.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(stringify({ score, partIndex: 0, timeline: timelines[0] })).toEqual([
      // system0, stave0: 0 | 1 | 2 | 3 | 4 | 5
      // system1, stave0: 6 | 7 | 8
      '[0ms] transition -> start(0)',
      '[2400ms] transition -> stop(0), start(1)',
      '[4800ms] transition -> stop(1), start(2)',
      '[7200ms] transition -> stop(2), start(3)',
      '[9600ms] transition -> stop(3), start(4)',
      '[12000ms] transition -> stop(4), start(5)',
      '[14400ms] systemend',
      '[14400ms] transition -> stop(5), start(6)',
      '[16800ms] transition -> stop(6), start(7)',
      '[19200ms] transition -> stop(7), start(8)',
      '[21600ms] transition -> stop(8)',
      '[21600ms] systemend',
    ]);
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

function stringify({
  score,
  partIndex,
  timeline,
}: {
  score: vexml.Score;
  partIndex: number;
  timeline: Timeline;
}): string[] {
  const elements = new Map<PlaybackElement, number>();
  score
    .getMeasures()
    .flatMap((measure) => measure.getFragments())
    .flatMap((fragment) => fragment.getParts().at(partIndex) ?? [])
    .flatMap((part) => part.getStaves())
    .flatMap((stave) => stave.getVoices())
    .flatMap((voice) => voice.getEntries())
    .forEach((element, index) => {
      elements.set(element, index);
    });

  function describeEvent(event: TimelineEvent): string {
    switch (event.type) {
      case 'transition':
        return describeTransition(event);
      case 'jump':
        return describeJump(event);
      case 'systemend':
        return describeSystemEnd(event);
    }
  }

  function describeTransition(event: TransitionEvent): string {
    const transitions = event.transitions.map((t) => `${t.type}(${elements.get(t.element)})`).join(', ');
    return `[${event.time.ms}ms] transition -> ${transitions}`;
  }

  function describeJump(event: JumpEvent): string {
    return `[${event.time.ms}ms] jump`;
  }

  function describeSystemEnd(event: SystemEndEvent): string {
    return `[${event.time.ms}ms] systemend`;
  }

  return timeline.getEvents().map((event) => describeEvent(event));
}

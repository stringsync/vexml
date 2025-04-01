import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { Timeline } from '@/playback';
import { NoopLogger } from '@/debug';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(Timeline, () => {
  const logger = new NoopLogger();

  it('creates for: single measure, single stave, different notes', () => {
    const score = render('playback_simple.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3
      '[0ms] start(0)',
      '[600ms] stop(0), start(1)',
      '[1200ms] stop(1), start(2)',
      '[1800ms] stop(2), start(3)',
      '[2400ms] stop(3), systemend',
    ]);
  });

  it('creates for: single measure, single stave, same notes', () => {
    const score = render('playback_same_note.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3
      '[0ms] start(0)',
      '[600ms] stop(0), start(1)',
      '[1200ms] stop(1), start(2)',
      '[1800ms] stop(2), start(3)',
      '[2400ms] stop(3), systemend',
    ]);
  });

  it('creates for: single measure, multiple staves, different notes', () => {
    const score = render('playback_multi_stave.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0   1   2   3
      // stave1: 4 5 6 7 8 9 10 11
      '[0ms] start(0), start(4)',
      '[300ms] stop(4), start(5)',
      '[600ms] stop(0), start(1), stop(5), start(6)',
      '[900ms] stop(6), start(7)',
      '[1200ms] stop(1), start(2), stop(7), start(8)',
      '[1500ms] stop(8), start(9)',
      '[1800ms] stop(2), start(3), stop(9), start(10)',
      '[2100ms] stop(10), start(11)',
      '[2400ms] stop(3), stop(11), systemend',
    ]);
  });

  it('creates for: single measure, multiple staves, multiple parts', () => {
    const score = render('playback_multi_part.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(2);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3
      '[0ms] start(0)',
      '[600ms] stop(0), start(1)',
      '[1200ms] stop(1), start(2)',
      '[1800ms] stop(2), start(3)',
      '[2400ms] stop(3), systemend',
    ]);
    expect(timelines[1].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3
      // stave1: 4 5 6 7
      '[0ms] start(0), start(4)',
      '[600ms] stop(0), start(1), stop(4), start(5)',
      '[1200ms] stop(1), start(2), stop(5), start(6)',
      '[1800ms] stop(2), start(3), stop(6), start(7)',
      '[2400ms] stop(3), stop(7), systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, different notes', () => {
    const score = render('playback_multi_measure.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3 4 | 5 6 7 8
      '[0ms] start(0)',
      '[600ms] stop(0), start(1)',
      '[1200ms] stop(1), start(2)',
      '[1800ms] stop(2), start(3)',
      '[2400ms] stop(3), start(4)',
      '[3000ms] stop(4), start(5)',
      '[3600ms] stop(5), start(6)',
      '[4200ms] stop(6), start(7)',
      '[4800ms] stop(7), systemend',
    ]);
  });

  it('creates for: single measure, single stave, repeat', () => {
    const score = render('playback_repeat.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3 :||
      '[0ms] start(0)',
      '[600ms] stop(0), start(1)',
      '[1200ms] stop(1), start(2)',
      '[1800ms] stop(2), start(3)',
      '[2400ms] stop(3), start(0), jump',
      '[3000ms] stop(0), start(1)',
      '[3600ms] stop(1), start(2)',
      '[4200ms] stop(2), start(3)',
      '[4800ms] stop(3), systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, repeat with endings', () => {
    const score = render('playback_repeat_endings.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3 | [ending1 -> 4 5 6 7] :|| [ending2 -> 8 9 10 11] | 12 13 14 15
      '[0ms] start(0)',
      '[600ms] stop(0), start(1)',
      '[1200ms] stop(1), start(2)',
      '[1800ms] stop(2), start(3)',
      '[2400ms] stop(3), start(4)',
      '[3000ms] stop(4), start(5)',
      '[3600ms] stop(5), start(6)',
      '[4200ms] stop(6), start(7)',
      '[4800ms] stop(7), start(0), jump',
      '[5400ms] stop(0), start(1)',
      '[6000ms] stop(1), start(2)',
      '[6600ms] stop(2), start(3)',
      '[7200ms] stop(3), start(8), jump',
      '[7800ms] stop(8), start(9)',
      '[8400ms] stop(9), start(10)',
      '[9000ms] stop(10), start(11)',
      '[9600ms] stop(11), start(12)',
      '[10200ms] stop(12), start(13)',
      '[10800ms] stop(13), start(14)',
      '[11400ms] stop(14), start(15)',
      '[12000ms] stop(15), systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, multiple systems', () => {
    const score = render('playback_multi_system.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // system0, stave0: 0 | 1 | 2 | 3 | 4 | 5
      // system1, stave0: 6 | 7 | 8
      '[0ms] start(0)',
      '[2400ms] stop(0), start(1)',
      '[4800ms] stop(1), start(2)',
      '[7200ms] stop(2), start(3)',
      '[9600ms] stop(3), start(4)',
      '[12000ms] stop(4), start(5)',
      '[14400ms] stop(5), start(6), systemend',
      '[16800ms] stop(6), start(7)',
      '[19200ms] stop(7), start(8)',
      '[21600ms] stop(8), systemend',
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

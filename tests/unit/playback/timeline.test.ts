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
      '[0ms] start(element(0))',
      '[600ms] stop(element(0)), start(element(1))',
      '[1200ms] stop(element(1)), start(element(2))',
      '[1800ms] stop(element(2)), start(element(3))',
      '[2400ms] stop(element(3)), systemend',
    ]);
  });

  it('creates for: single measure, single stave, same notes', () => {
    const score = render('playback_same_note.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3
      '[0ms] start(element(0))',
      '[600ms] stop(element(0)), start(element(1))',
      '[1200ms] stop(element(1)), start(element(2))',
      '[1800ms] stop(element(2)), start(element(3))',
      '[2400ms] stop(element(3)), systemend',
    ]);
  });

  it('creates for: single measure, multiple staves, different notes', () => {
    const score = render('playback_multi_stave.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0   1   2   3
      // stave1: 4 5 6 7 8 9 10 11
      '[0ms] start(element(0)), start(element(4))',
      '[300ms] stop(element(4)), start(element(5))',
      '[600ms] stop(element(0)), stop(element(5)), start(element(1)), start(element(6))',
      '[900ms] stop(element(6)), start(element(7))',
      '[1200ms] stop(element(1)), stop(element(7)), start(element(2)), start(element(8))',
      '[1500ms] stop(element(8)), start(element(9))',
      '[1800ms] stop(element(2)), stop(element(9)), start(element(3)), start(element(10))',
      '[2100ms] stop(element(10)), start(element(11))',
      '[2400ms] stop(element(3)), stop(element(11)), systemend',
    ]);
  });

  it('creates for: single measure, multiple staves, multiple parts', () => {
    const score = render('playback_multi_part.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(2);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3
      '[0ms] start(element(0))',
      '[600ms] stop(element(0)), start(element(1))',
      '[1200ms] stop(element(1)), start(element(2))',
      '[1800ms] stop(element(2)), start(element(3))',
      '[2400ms] stop(element(3)), systemend',
    ]);
    expect(timelines[1].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3
      // stave1: 4 5 6 7
      '[0ms] start(element(0)), start(element(4))',
      '[600ms] stop(element(0)), stop(element(4)), start(element(1)), start(element(5))',
      '[1200ms] stop(element(1)), stop(element(5)), start(element(2)), start(element(6))',
      '[1800ms] stop(element(2)), stop(element(6)), start(element(3)), start(element(7))',
      '[2400ms] stop(element(3)), stop(element(7)), systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, different notes', () => {
    const score = render('playback_multi_measure.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3 4 | 5 6 7 8
      '[0ms] start(element(0))',
      '[600ms] stop(element(0)), start(element(1))',
      '[1200ms] stop(element(1)), start(element(2))',
      '[1800ms] stop(element(2)), start(element(3))',
      '[2400ms] stop(element(3)), start(element(4))',
      '[3000ms] stop(element(4)), start(element(5))',
      '[3600ms] stop(element(5)), start(element(6))',
      '[4200ms] stop(element(6)), start(element(7))',
      '[4800ms] stop(element(7)), systemend',
    ]);
  });

  it('creates for: single measure, single stave, repeat', () => {
    const score = render('playback_repeat.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 1 2 3 :||
      '[0ms] start(element(0))',
      '[600ms] stop(element(0)), start(element(1))',
      '[1200ms] stop(element(1)), start(element(2))',
      '[1800ms] stop(element(2)), start(element(3))',
      '[2400ms] stop(element(3)), jump, start(element(0))',
      '[3000ms] stop(element(0)), start(element(1))',
      '[3600ms] stop(element(1)), start(element(2))',
      '[4200ms] stop(element(2)), start(element(3))',
      '[4800ms] stop(element(3)), systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, repeat with endings', () => {
    const score = render('playback_repeat_endings.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0: 0 | [ending1 -> 1] :|| [ending2 -> 2] :|| [ending3 -> 3]
      '[0ms] start(element(0))',
      '[2400ms] stop(element(0)), start(element(1))',
      '[4800ms] stop(element(1)), jump, start(element(0))',
      '[7200ms] stop(element(0)), jump, start(element(2))',
      '[9600ms] stop(element(2)), jump, start(element(0))',
      '[12000ms] stop(element(0)), jump, start(element(3))',
      '[14400ms] stop(element(3)), systemend',
    ]);
  });

  it('creates for: multiple measures, single stave, multiple systems', () => {
    const score = render('playback_multi_system.musicxml', { BASE_VOICE_WIDTH: 900 });

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // system0, stave0: 0
      // system1, stave0: 1
      '[0ms] start(element(0))',
      '[2400ms] stop(element(0)), systemend, start(element(1))',
      '[4800ms] stop(element(1)), systemend',
    ]);
  });

  it('creates for: documents that have backwards formatting', () => {
    const score = render('playback_backwards_formatting.musicxml');

    const timelines = Timeline.create(logger, score);

    expect(timelines).toHaveLength(1);
    expect(timelines[0].toHumanReadable()).toEqual([
      // stave0, voice0: 0     1  2  3  4  5  6  7     8  9 10 11 12 13
      // stave1, voice0: 14 15       16          17 18      19
      // stave2, voice1: 20                      21
      '[0ms] start(element(0)), start(element(14)), start(element(20))',
      '[150ms] stop(element(14)), start(element(15))',
      '[300ms] stop(element(0)), start(element(1))',
      '[450ms] stop(element(1)), start(element(2))',
      '[600ms] stop(element(2)), stop(element(15)), start(element(3)), start(element(16))',
      '[750ms] stop(element(3)), start(element(4))',
      '[900ms] stop(element(4)), start(element(5))',
      '[1050ms] stop(element(5)), start(element(6))',
      '[1200ms] stop(element(6)), stop(element(16)), stop(element(20)), start(element(7)), start(element(17)), start(element(21))',
      '[1350ms] stop(element(17)), start(element(18))',
      '[1500ms] stop(element(7)), start(element(8))',
      '[1650ms] stop(element(8)), start(element(9))',
      '[1800ms] stop(element(9)), stop(element(18)), start(element(10)), start(element(19))',
      '[1950ms] stop(element(10)), start(element(11))',
      '[2100ms] stop(element(11)), start(element(12))',
      '[2250ms] stop(element(12)), start(element(13))',
      '[2400ms] stop(element(13)), stop(element(19)), stop(element(21)), systemend',
    ]);
  });
});

function render(filename: string, config?: Partial<vexml.Config>): vexml.Score {
  const musicXMLPath = path.resolve(DATA_DIR, filename);
  const musicXML = fs.readFileSync(musicXMLPath).toString();
  const div = document.createElement('div');
  return vexml.renderMusicXML(musicXML, div, {
    config: {
      WIDTH: 900,
      ...config,
    },
  });
}

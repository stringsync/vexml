import * as vexml from '@/index';
import * as path from 'path';
import { CursorFrame, Timeline } from '@/playback';
import { NoopLogger, MemoryLogger } from '@/debug';
import fs from 'fs';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(CursorFrame, () => {
  let log: MemoryLogger;

  beforeEach(() => {
    log = new MemoryLogger();
  });

  it('creates for: single measure, single stave, different notes', () => {
    const [score, timelines] = render('playback_simple.musicxml');

    const frames = CursorFrame.create(log, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(log.getLogs()).toBeEmpty();
    expect(timelines).toHaveLength(1);
    expect(frames).toHaveLength(4);
    // stave0: 0 1 2 3
    expect(frames[0].toHumanReadable()).toEqual([
      't: [0ms - 600ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[1].toHumanReadable()).toEqual([
      't: [600ms - 1200ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[2].toHumanReadable()).toEqual([
      't: [1200ms - 1800ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[3].toHumanReadable()).toEqual([
      't: [1800ms - 2400ms]',
      'x: [left(element(3)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
  });

  it('creates for: single measure, single stave, same notes', () => {
    const [score, timelines] = render('playback_same_note.musicxml');

    const frames = CursorFrame.create(log, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(log.getLogs()).toBeEmpty();
    expect(timelines).toHaveLength(1);
    expect(frames).toHaveLength(4);
    // stave0: 0 1 2 3
    expect(frames[0].toHumanReadable()).toEqual([
      't: [0ms - 600ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[1].toHumanReadable()).toEqual([
      't: [600ms - 1200ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[2].toHumanReadable()).toEqual([
      't: [1200ms - 1800ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[3].toHumanReadable()).toEqual([
      't: [1800ms - 2400ms]',
      'x: [left(element(3)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
  });

  it('creates for: single measure, multiple staves, different notes', () => {
    const [score, timelines] = render('playback_multi_stave.musicxml');

    const frames = CursorFrame.create(log, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(log.getLogs()).toBeEmpty();
    expect(timelines).toHaveLength(1);
    expect(frames).toHaveLength(8);
    // stave0: 0   1   2   3
    // stave1: 4 5 6 7 8 9 10 11
    expect(frames[0].toHumanReadable()).toEqual([
      't: [0ms - 300ms]',
      'x: [left(element(0)) - left(element(5))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[1].toHumanReadable()).toEqual([
      't: [300ms - 600ms]',
      'x: [left(element(5)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[2].toHumanReadable()).toEqual([
      't: [600ms - 900ms]',
      'x: [left(element(1)) - left(element(7))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[3].toHumanReadable()).toEqual([
      't: [900ms - 1200ms]',
      'x: [left(element(7)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[4].toHumanReadable()).toEqual([
      't: [1200ms - 1500ms]',
      'x: [left(element(2)) - left(element(9))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[5].toHumanReadable()).toEqual([
      't: [1500ms - 1800ms]',
      'x: [left(element(9)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[6].toHumanReadable()).toEqual([
      't: [1800ms - 2100ms]',
      'x: [left(element(3)) - left(element(11))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[7].toHumanReadable()).toEqual([
      't: [2100ms - 2400ms]',
      'x: [left(element(11)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
  });

  it('creates for: single measure, multiple staves, multiple parts', () => {
    const [score, timelines] = render('playback_multi_part.musicxml');

    // This ends up adding test coverage for y-spans.
    const span0 = { fromPartIndex: 0, toPartIndex: 0 };
    const span1 = { fromPartIndex: 0, toPartIndex: 1 };

    const framesPart0 = CursorFrame.create(log, score, timelines[0], span0);
    const framesPart1 = CursorFrame.create(log, score, timelines[1], span1);

    expect(log.getLogs()).toBeEmpty();
    expect(timelines).toHaveLength(2);
    expect(framesPart0).toHaveLength(4);
    // part0, stave0: 0 1 2 3
    expect(framesPart0[0].toHumanReadable()).toEqual([
      't: [0ms - 600ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(framesPart0[1].toHumanReadable()).toEqual([
      't: [600ms - 1200ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(framesPart0[2].toHumanReadable()).toEqual([
      't: [1200ms - 1800ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(framesPart0[3].toHumanReadable()).toEqual([
      't: [1800ms - 2400ms]',
      'x: [left(element(3)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);

    expect(framesPart1).toHaveLength(4);
    // part1, stave0: 0 1 2 3
    // part1, stave1: 4 5 6 7
    expect(framesPart1[0].toHumanReadable()).toEqual([
      't: [0ms - 600ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(1))]',
    ]);
    expect(framesPart1[1].toHumanReadable()).toEqual([
      't: [600ms - 1200ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(1))]',
    ]);
    expect(framesPart1[2].toHumanReadable()).toEqual([
      't: [1200ms - 1800ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(1))]',
    ]);
    expect(framesPart1[3].toHumanReadable()).toEqual([
      't: [1800ms - 2400ms]',
      'x: [left(element(3)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(1))]',
    ]);
  });

  it('creates for: multiple measures, single stave, different notes', () => {
    const [score, timelines] = render('playback_multi_measure.musicxml');

    const frames = CursorFrame.create(log, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(log.getLogs()).toBeEmpty();
    expect(timelines).toHaveLength(1);
    expect(frames).toHaveLength(8);
    // stave0: 0 1 2 3 4 | 5 6 7 8
    expect(frames[0].toHumanReadable()).toEqual([
      't: [0ms - 600ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[1].toHumanReadable()).toEqual([
      't: [600ms - 1200ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[2].toHumanReadable()).toEqual([
      't: [1200ms - 1800ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[3].toHumanReadable()).toEqual([
      't: [1800ms - 2400ms]',
      'x: [left(element(3)) - left(element(4))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[4].toHumanReadable()).toEqual([
      't: [2400ms - 3000ms]',
      'x: [left(element(4)) - left(element(5))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[5].toHumanReadable()).toEqual([
      't: [3000ms - 3600ms]',
      'x: [left(element(5)) - left(element(6))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[6].toHumanReadable()).toEqual([
      't: [3600ms - 4200ms]',
      'x: [left(element(6)) - left(element(7))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[7].toHumanReadable()).toEqual([
      't: [4200ms - 4800ms]',
      'x: [left(element(7)) - right(measure(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
  });

  it('creates for: single measure, single stave, repeat', () => {
    const [score, timelines] = render('playback_repeat.musicxml');

    const frames = CursorFrame.create(log, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(log.getLogs()).toBeEmpty();
    expect(timelines).toHaveLength(1);
    expect(frames).toHaveLength(8);
    // stave0: 0 1 2 3 :||
    expect(frames[0].toHumanReadable()).toEqual([
      't: [0ms - 600ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[1].toHumanReadable()).toEqual([
      't: [600ms - 1200ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[2].toHumanReadable()).toEqual([
      't: [1200ms - 1800ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[3].toHumanReadable()).toEqual([
      't: [1800ms - 2400ms]',
      'x: [left(element(3)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[4].toHumanReadable()).toEqual([
      't: [2400ms - 3000ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[5].toHumanReadable()).toEqual([
      't: [3000ms - 3600ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[6].toHumanReadable()).toEqual([
      't: [3600ms - 4200ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[7].toHumanReadable()).toEqual([
      't: [4200ms - 4800ms]',
      'x: [left(element(3)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
  });

  it('creates for: multiple measures, single stave, repeat with endings', () => {
    const [score, timelines] = render('playback_repeat_endings.musicxml');

    const frames = CursorFrame.create(log, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(log.getLogs()).toBeEmpty();
    expect(timelines).toHaveLength(1);
    expect(frames).toHaveLength(6);
    // stave0: 0 | [ending1 -> 1] :|| [ending2 -> 2] :|| [ending3 -> 3]
    expect(frames[0].toHumanReadable()).toEqual([
      't: [0ms - 2400ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[1].toHumanReadable()).toEqual([
      't: [2400ms - 4800ms]',
      'x: [left(element(1)) - right(measure(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[2].toHumanReadable()).toEqual([
      't: [4800ms - 7200ms]',
      'x: [left(element(0)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[3].toHumanReadable()).toEqual([
      't: [7200ms - 9600ms]',
      'x: [left(element(2)) - right(measure(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[4].toHumanReadable()).toEqual([
      't: [9600ms - 12000ms]',
      'x: [left(element(0)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[5].toHumanReadable()).toEqual([
      't: [12000ms - 14400ms]',
      'x: [left(element(3)) - right(measure(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
  });

  it('creates for: multiple measures, single stave, multiple systems', () => {
    const [score, timelines] = render('playback_multi_system.musicxml');

    const frames = CursorFrame.create(log, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(log.getLogs()).toBeEmpty();
    expect(timelines).toHaveLength(1);
    // system0, stave0: 0 | 1 | 2 | 3 | 4 | 5
    // system1, stave0: 6 | 7 | 8
    expect(frames).toHaveLength(9);
    expect(frames[0].toHumanReadable()).toEqual([
      't: [0ms - 2400ms]',
      'x: [left(element(0)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[1].toHumanReadable()).toEqual([
      't: [2400ms - 4800ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[2].toHumanReadable()).toEqual([
      't: [4800ms - 7200ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[3].toHumanReadable()).toEqual([
      't: [7200ms - 9600ms]',
      'x: [left(element(3)) - left(element(4))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[4].toHumanReadable()).toEqual([
      't: [9600ms - 12000ms]',
      'x: [left(element(4)) - left(element(5))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[5].toHumanReadable()).toEqual([
      't: [12000ms - 14400ms]',
      'x: [left(element(5)) - right(measure(5))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[6].toHumanReadable()).toEqual([
      't: [14400ms - 16800ms]',
      'x: [left(element(6)) - left(element(7))]',
      'y: [top(system(1), part(0)) - bottom(system(1), part(0))]',
    ]);
    expect(frames[7].toHumanReadable()).toEqual([
      't: [16800ms - 19200ms]',
      'x: [left(element(7)) - left(element(8))]',
      'y: [top(system(1), part(0)) - bottom(system(1), part(0))]',
    ]);
    expect(frames[8].toHumanReadable()).toEqual([
      't: [19200ms - 21600ms]',
      'x: [left(element(8)) - right(measure(8))]',
      'y: [top(system(1), part(0)) - bottom(system(1), part(0))]',
    ]);
  });

  it('creates for: documents that have backwards formatting', () => {
    const [score, timelines] = render('playback_backwards_formatting.musicxml');

    const frames = CursorFrame.create(log, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(timelines).toHaveLength(1);
    expect(log.getLogs()).toBeEmpty();
    // stave0, voice0: 0     1  2  3  4  5  6  7     8  9 10 11 12 13
    // stave1, voice0: 14 15       16          17 18      19
    // stave2, voice1: 20                      21
    expect(frames).toHaveLength(16);
    expect(frames[0].toHumanReadable()).toEqual([
      't: [0ms - 150ms]',
      'x: [left(element(0)) - left(element(15))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[1].toHumanReadable()).toEqual([
      't: [150ms - 300ms]',
      'x: [left(element(15)) - left(element(1))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[2].toHumanReadable()).toEqual([
      't: [300ms - 450ms]',
      'x: [left(element(1)) - left(element(2))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[3].toHumanReadable()).toEqual([
      't: [450ms - 600ms]',
      'x: [left(element(2)) - left(element(3))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[4].toHumanReadable()).toEqual([
      't: [600ms - 750ms]',
      'x: [left(element(3)) - left(element(4))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[5].toHumanReadable()).toEqual([
      't: [750ms - 900ms]',
      'x: [left(element(4)) - left(element(5))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[6].toHumanReadable()).toEqual([
      't: [900ms - 1050ms]',
      'x: [left(element(5)) - left(element(6))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[7].toHumanReadable()).toEqual([
      't: [1050ms - 1200ms]',
      'x: [left(element(6)) - left(element(7))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[8].toHumanReadable()).toEqual([
      't: [1200ms - 1350ms]',
      'x: [left(element(7)) - left(element(18))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[9].toHumanReadable()).toEqual([
      't: [1350ms - 1500ms]',
      'x: [left(element(18)) - left(element(8))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[10].toHumanReadable()).toEqual([
      't: [1500ms - 1650ms]',
      'x: [left(element(8)) - left(element(9))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[11].toHumanReadable()).toEqual([
      't: [1650ms - 1800ms]',
      'x: [left(element(9)) - left(element(10))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[12].toHumanReadable()).toEqual([
      't: [1800ms - 1950ms]',
      'x: [left(element(10)) - left(element(11))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[13].toHumanReadable()).toEqual([
      't: [1950ms - 2100ms]',
      'x: [left(element(11)) - left(element(12))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[14].toHumanReadable()).toEqual([
      't: [2100ms - 2250ms]',
      'x: [left(element(12)) - left(element(13))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
    expect(frames[15].toHumanReadable()).toEqual([
      't: [2250ms - 2400ms]',
      'x: [left(element(13)) - right(measure(0))]',
      'y: [top(system(0), part(0)) - bottom(system(0), part(0))]',
    ]);
  });
});

function render(filename: string): [vexml.Score, Timeline[]] {
  const musicXMLPath = path.resolve(DATA_DIR, filename);
  const musicXML = fs.readFileSync(musicXMLPath).toString();
  const div = document.createElement('div');
  const score = vexml.renderMusicXML(musicXML, div, {
    config: {
      WIDTH: 900,
    },
  });
  const timelines = Timeline.create(new NoopLogger(), score);
  return [score, timelines];
}

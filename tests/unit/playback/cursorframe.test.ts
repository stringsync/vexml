import * as vexml from '@/index';
import * as path from 'path';
import { CursorFrame, Timeline } from '@/playback';
import { NoopLogger, MemoryLogger } from '@/debug';
import fs from 'fs';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(CursorFrame, () => {
  let logger: MemoryLogger;

  beforeEach(() => {
    logger = new MemoryLogger();
  });

  it('creates for: single measure, single stave, different notes', () => {
    const [score, timelines] = render('playback_simple.musicxml');

    const frames = CursorFrame.create(logger, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(logger.getLogs()).toBeEmpty();
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

    const frames = CursorFrame.create(logger, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(logger.getLogs()).toBeEmpty();
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

    const frames = CursorFrame.create(logger, score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });

    expect(logger.getLogs()).toBeEmpty();
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

  // it('creates for: single measure, multiple staves, multiple parts', () => {
  //   const [score, timelines] = render('playback_multi_part.musicxml');
  // });

  // it('creates for: multiple measures, single stave, different notes', () => {
  //   const [score, timelines] = render('playback_multi_measure.musicxml');
  // });

  // it('creates for: single measure, single stave, repeat', () => {
  //   const [score, timelines] = render('playback_repeat.musicxml');
  // });

  // it('creates for: multiple measures, single stave, repeat with endings', () => {
  //   const [score, timelines] = render('playback_repeat_endings.musicxml');
  // });

  // it('creates for: multiple measures, single stave, multiple systems', () => {
  //   const [score, timelines] = render('playback_multi_system.musicxml');
  // });
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

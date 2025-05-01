import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { EmptyCursorFrame, HintDescriber, LazyCursorStateHintProvider } from '@/playback';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(LazyCursorStateHintProvider, () => {
  it('does not throw when the previous frame is undefined', () => {
    const currentFrame = new EmptyCursorFrame();
    const previousFrame = undefined;
    const hintDescriber = HintDescriber.noop();

    const provider = new LazyCursorStateHintProvider(currentFrame, previousFrame, hintDescriber);

    expect(() => provider.get()).not.toThrow();
  });

  it('does not throw when there are two empty frames', () => {
    const currentFrame = new EmptyCursorFrame();
    const previousFrame = new EmptyCursorFrame();
    const hintDescriber = HintDescriber.noop();

    const provider = new LazyCursorStateHintProvider(currentFrame, previousFrame, hintDescriber);

    expect(() => provider.get()).not.toThrow();
  });

  it('provides for: single measure, single stave, different notes', () => {
    const score = render('playback_simple.musicxml');
    const cursor = score.addCursor();

    const states = Array.from(cursor.iterable());

    expect(states).toHaveLength(3);
    // stave0: 0 1 2 3
    expect(states[0].hints.toHumanReadable()).toEqual(['start(element(0))']);
    expect(states[1].hints.toHumanReadable()).toEqual(['stop(element(0))', 'start(element(1))']);
    expect(states[2].hints.toHumanReadable()).toEqual(['stop(element(1))', 'start(element(2))']);
  });

  it('provides for: single measure, single stave, same notes', () => {
    const score = render('playback_same_note.musicxml');
    const cursor = score.addCursor();

    const states = Array.from(cursor.iterable());

    expect(states).toHaveLength(3);
    // stave0: 0 1 2 3
    expect(states[0].hints.toHumanReadable()).toEqual(['start(element(0))']);
    expect(states[1].hints.toHumanReadable()).toEqual([
      'stop(element(0))',
      'start(element(1))',
      'retrigger(element(0), element(1))',
    ]);
    expect(states[2].hints.toHumanReadable()).toEqual([
      'stop(element(1))',
      'start(element(2))',
      'retrigger(element(1), element(2))',
    ]);
  });

  it('provides for: single measure, multiple staves, different notes', () => {
    const score = render('playback_multi_stave.musicxml');
    const cursor = score.addCursor();

    const states = Array.from(cursor.iterable());

    expect(states).toHaveLength(7);
    // stave0: 0   1   2   3
    // stave1: 4 5 6 7 8 9 10 11
    expect(states[0].hints.toHumanReadable()).toEqual(['start(element(0))', 'start(element(4))']);
    expect(states[1].hints.toHumanReadable()).toEqual(['stop(element(4))', 'start(element(5))']);
    expect(states[2].hints.toHumanReadable()).toEqual([
      'stop(element(0))',
      'stop(element(5))',
      'start(element(1))',
      'start(element(6))',
    ]);
    expect(states[3].hints.toHumanReadable()).toEqual(['stop(element(6))', 'start(element(7))']);
    expect(states[4].hints.toHumanReadable()).toEqual([
      'stop(element(1))',
      'stop(element(7))',
      'start(element(2))',
      'start(element(8))',
    ]);
    expect(states[5].hints.toHumanReadable()).toEqual(['stop(element(8))', 'start(element(9))']);
    expect(states[6].hints.toHumanReadable()).toEqual([
      'stop(element(2))',
      'stop(element(9))',
      'start(element(3))',
      'start(element(10))',
    ]);
  });

  it('provides for: single measure, multiple staves, multiple parts', () => {
    const score = render('playback_multi_part.musicxml');
    const cursor0 = score.addCursor({ partIndex: 0 });
    const cursor1 = score.addCursor({ partIndex: 1 });

    const states0 = Array.from(cursor0.iterable());
    const states1 = Array.from(cursor1.iterable());

    expect(states0).toHaveLength(3);
    // stave0: 0 1 2 3
    expect(states0[0].hints.toHumanReadable()).toEqual(['start(element(0))']);
    expect(states0[1].hints.toHumanReadable()).toEqual(['stop(element(0))', 'start(element(1))']);
    expect(states0[2].hints.toHumanReadable()).toEqual(['stop(element(1))', 'start(element(2))']);

    expect(states1).toHaveLength(3);
    // stave0: 0 1 2 3
    // stave1: 4 5 6 7
    expect(states1[0].hints.toHumanReadable()).toEqual(['start(element(0))', 'start(element(4))']);
    expect(states1[1].hints.toHumanReadable()).toEqual([
      'stop(element(0))',
      'stop(element(4))',
      'start(element(1))',
      'start(element(5))',
    ]);
    expect(states1[2].hints.toHumanReadable()).toEqual([
      'stop(element(1))',
      'stop(element(5))',
      'start(element(2))',
      'start(element(6))',
    ]);
  });

  it('provides for: multiple measures, single stave, different notes', () => {
    const score = render('playback_multi_measure.musicxml');
    const cursor = score.addCursor();

    const states = Array.from(cursor.iterable());

    expect(states).toHaveLength(7);
    // stave0: 0 1 2 3 4 | 5 6 7 8
    expect(states[0].hints.toHumanReadable()).toEqual(['start(element(0))']);
    expect(states[1].hints.toHumanReadable()).toEqual(['stop(element(0))', 'start(element(1))']);
    expect(states[2].hints.toHumanReadable()).toEqual(['stop(element(1))', 'start(element(2))']);
    expect(states[3].hints.toHumanReadable()).toEqual(['stop(element(2))', 'start(element(3))']);
    expect(states[4].hints.toHumanReadable()).toEqual(['stop(element(3))', 'start(element(4))']);
    expect(states[5].hints.toHumanReadable()).toEqual(['stop(element(4))', 'start(element(5))']);
    expect(states[6].hints.toHumanReadable()).toEqual(['stop(element(5))', 'start(element(6))']);
  });

  it('provides for: single measure, single stave, repeat', () => {
    const score = render('playback_repeat.musicxml');
    const cursor = score.addCursor();

    const states = Array.from(cursor.iterable());

    expect(states).toHaveLength(7);
    // stave0: 0 1 2 3 :||
    expect(states[0].hints.toHumanReadable()).toEqual(['start(element(0))']);
    expect(states[1].hints.toHumanReadable()).toEqual(['stop(element(0))', 'start(element(1))']);
    expect(states[2].hints.toHumanReadable()).toEqual(['stop(element(1))', 'start(element(2))']);
    expect(states[3].hints.toHumanReadable()).toEqual(['stop(element(2))', 'start(element(3))']);
    expect(states[4].hints.toHumanReadable()).toEqual(['stop(element(3))', 'start(element(0))']);
    expect(states[5].hints.toHumanReadable()).toEqual(['stop(element(0))', 'start(element(1))']);
    expect(states[6].hints.toHumanReadable()).toEqual(['stop(element(1))', 'start(element(2))']);
  });

  it('provides for: multiple measures, single stave, repeat with endings', () => {
    const score = render('playback_repeat_endings.musicxml');
    const cursor = score.addCursor();

    const states = Array.from(cursor.iterable());

    expect(states).toHaveLength(5);
    // stave0: 0 | [ending1 -> 1] :|| [ending2 -> 2] :|| [ending3 -> 3]
    expect(states[0].hints.toHumanReadable()).toEqual(['start(element(0))']);
    expect(states[1].hints.toHumanReadable()).toEqual([
      'stop(element(0))',
      'start(element(1))',
      'retrigger(element(0), element(1))',
    ]);
    expect(states[2].hints.toHumanReadable()).toEqual([
      'stop(element(1))',
      'start(element(0))',
      'retrigger(element(1), element(0))',
    ]);
    expect(states[3].hints.toHumanReadable()).toEqual([
      'stop(element(0))',
      'start(element(2))',
      'retrigger(element(0), element(2))',
    ]);
    expect(states[4].hints.toHumanReadable()).toEqual([
      'stop(element(2))',
      'start(element(0))',
      'retrigger(element(2), element(0))',
    ]);
  });

  it('provides for: multiple measures, single stave, multiple systems', () => {
    const score = render('playback_multi_system.musicxml', { BASE_VOICE_WIDTH: 900 });
    const cursor = score.addCursor();

    const states = Array.from(cursor.iterable());

    expect(states).toHaveLength(1);
    // system0, stave0: 0
    // system1, stave0: 1
    expect(states[0].hints.toHumanReadable()).toEqual(['start(element(0))']);
  });

  it('provides for: documents that have backwards formatting', () => {
    const score = render('playback_backwards_formatting.musicxml');
    const cursor = score.addCursor();

    const states = Array.from(cursor.iterable());

    expect(states).toHaveLength(15);
    // stave0, voice0: 0     1  2  3  4  5  6  7     8  9 10 11 12 13
    // stave1, voice0: 14 15       16          17 18      19
    // stave2, voice1: 20                      21
    expect(states[0].hints.toHumanReadable()).toEqual([
      'start(element(0))',
      'start(element(14))',
      'start(element(20))',
    ]);
    expect(states[1].hints.toHumanReadable()).toEqual(['stop(element(14))', 'start(element(15))']);
    expect(states[2].hints.toHumanReadable()).toEqual(['stop(element(0))', 'start(element(1))']);
    expect(states[3].hints.toHumanReadable()).toEqual(['stop(element(1))', 'start(element(2))']);
    expect(states[4].hints.toHumanReadable()).toEqual([
      'stop(element(15))',
      'stop(element(2))',
      'start(element(3))',
      'start(element(16))',
      'sustain(element(15), element(16))',
    ]);
    expect(states[5].hints.toHumanReadable()).toEqual(['stop(element(3))', 'start(element(4))']);
    expect(states[6].hints.toHumanReadable()).toEqual(['stop(element(4))', 'start(element(5))']);
    expect(states[7].hints.toHumanReadable()).toEqual(['stop(element(5))', 'start(element(6))']);
    expect(states[8].hints.toHumanReadable()).toEqual([
      'stop(element(20))',
      'stop(element(16))',
      'stop(element(6))',
      'start(element(7))',
      'start(element(17))',
      'start(element(21))',
      'retrigger(element(20), element(21))',
    ]);
    expect(states[9].hints.toHumanReadable()).toEqual(['stop(element(17))', 'start(element(18))']);
    expect(states[10].hints.toHumanReadable()).toEqual(['stop(element(7))', 'start(element(8))']);
    expect(states[11].hints.toHumanReadable()).toEqual(['stop(element(8))', 'start(element(9))']);
    expect(states[12].hints.toHumanReadable()).toEqual([
      'stop(element(18))',
      'stop(element(9))',
      'start(element(10))',
      'start(element(19))',
      'sustain(element(18), element(19))',
    ]);
    expect(states[13].hints.toHumanReadable()).toEqual(['stop(element(10))', 'start(element(11))']);
    expect(states[14].hints.toHumanReadable()).toEqual(['stop(element(11))', 'start(element(12))']);
  });

  it('provides for: chords', () => {
    const score = render('playback_chords.musicxml');
    const cursor0 = score.addCursor({ partIndex: 0 });
    const cursor1 = score.addCursor({ partIndex: 1 });

    const states0 = Array.from(cursor0.iterable());
    const states1 = Array.from(cursor1.iterable());

    expect(states0).toHaveLength(4);
    // NOTE: There are rests that overlap with the notes.
    expect(states0[0].hints.toHumanReadable()).toEqual(['start(element(0))', 'start(element(3))']);
    expect(states0[1].hints.toHumanReadable()).toEqual([
      'stop(element(0))',
      'stop(element(3))',
      'start(element(1))',
      'start(element(4))',
      'start(element(7))',
      'retrigger(element(0), element(1))',
    ]);
    expect(states0[2].hints.toHumanReadable()).toEqual(['stop(element(7))', 'start(element(8))']);
    expect(states0[3].hints.toHumanReadable()).toEqual([
      'stop(element(1))',
      'stop(element(4))',
      'stop(element(8))',
      'start(element(2))',
      'start(element(5))',
      'start(element(9))',
    ]);

    expect(states1).toHaveLength(4);
    // NOTE: There are rests that overlap with the notes.
    expect(states1[0].hints.toHumanReadable()).toEqual(['start(element(0))']);
    expect(states1[1].hints.toHumanReadable()).toEqual(['stop(element(0))', 'start(element(1))', 'start(element(4))']);
    expect(states1[2].hints.toHumanReadable()).toEqual(['stop(element(4))', 'start(element(5))']);
    expect(states1[3].hints.toHumanReadable()).toEqual([
      'stop(element(1))',
      'stop(element(5))',
      'start(element(2))',
      'start(element(6))',
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

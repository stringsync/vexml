import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { EmptyCursorFrame, LazyCursorStateHintProvider } from '@/playback';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

// NOTE: If this requires more rigourous testing, follow the same pattern as timeline.test.ts and
// defaultcursorframe.test.ts and create a human readable description of the hints to assert.

describe(LazyCursorStateHintProvider, () => {
  it('does not throw when the previous frame is undefined', () => {
    const currentFrame = new EmptyCursorFrame();
    const previousFrame = undefined;

    const provider = new LazyCursorStateHintProvider(currentFrame, previousFrame);

    expect(() => provider.get()).not.toThrow();
  });

  it('does not throw when there are two empty frames', () => {
    const currentFrame = new EmptyCursorFrame();
    const previousFrame = new EmptyCursorFrame();

    const provider = new LazyCursorStateHintProvider(currentFrame, previousFrame);

    expect(() => provider.get()).not.toThrow();
  });

  it('does not throw for: single measure, single stave, different notes', () => {
    const score = render('playback_simple.musicxml');
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: single measure, single stave, same notes', () => {
    const score = render('playback_same_note.musicxml');
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: single measure, multiple staves, different notes', () => {
    const score = render('playback_multi_stave.musicxml');
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: single measure, multiple staves, multiple parts', () => {
    const score = render('playback_multi_part.musicxml');
    const cursor0 = score.addCursor({ partIndex: 0 });
    const cursor1 = score.addCursor({ partIndex: 1 });

    for (const state of cursor0.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }

    for (const state of cursor1.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: multiple measures, single stave, different notes', () => {
    const score = render('playback_multi_measure.musicxml');
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: single measure, single stave, repeat', () => {
    const score = render('playback_repeat.musicxml');
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: multiple measures, single stave, repeat with endings', () => {
    const score = render('playback_repeat_endings.musicxml');
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: multiple measures, single stave, multiple systems', () => {
    const score = render('playback_multi_system.musicxml', { BASE_VOICE_WIDTH: 900 });
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: documents that have backwards formatting', () => {
    const score = render('playback_backwards_formatting.musicxml');
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
  });

  it('does not throw for: chords', () => {
    const score = render('playback_chords.musicxml');
    const cursor = score.addCursor();

    for (const state of cursor.iterable()) {
      expect(() => state.hints.get()).not.toThrow();
    }
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

import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { CursorFrame, Timeline } from '@/playback';
import { NoopLogger } from '@/debug';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(CursorFrame, () => {
  it.only('creates for: single measure, single stave, different notes', () => {
    const [score, timelines] = render('playback_simple.musicxml');

    const frames = CursorFrame.create(score, timelines[0], { fromPartIndex: 0, toPartIndex: 0 });
  });

  // it('creates for: single measure, single stave, same notes', () => {
  //   const [score, timelines] = render('playback_same_note.musicxml');
  // });

  // it('creates for: single measure, multiple staves, different notes', () => {
  //   const [score, timelines] = render('playback_multi_stave.musicxml');
  // });

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

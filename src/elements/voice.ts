import * as vexflow from 'vexflow';
import * as spatial from '@/spatial';
import { Note } from './note';

export class Voice {
  constructor(private ctx: vexflow.RenderContext, private entries: Array<Note>) {}

  getRect(): spatial.Rect {
    return spatial.Rect.merge(this.entries.map((entry) => entry.getRect()));
  }

  getEntries(): Array<Note> {
    return this.entries;
  }

  getVexflowVoice(): vexflow.Voice {
    const voice = new vexflow.Voice({
      beatValue: 4,
      numBeats: 4,
    });

    voice.addTickables([
      new vexflow.StaveNote({
        duration: 'q',
        keys: ['c/4'],
        clef: 'treble',
      }),
      new vexflow.StaveNote({
        duration: 'q',
        keys: ['c/4'],
        clef: 'treble',
      }),
      new vexflow.StaveNote({
        duration: 'q',
        keys: ['c/4'],
        clef: 'treble',
      }),
      new vexflow.StaveNote({
        duration: 'q',
        keys: ['c/4'],
        clef: 'treble',
      }),
    ]);

    return voice;
  }

  draw(): this {
    for (const entry of this.entries) {
      entry.draw();
    }

    return this;
  }
}

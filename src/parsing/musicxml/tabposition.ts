import * as data from '@/data';
import * as musicxml from '@/musicxml';
import type * as mdom from '@stringsync/mdom';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class TabPosition {
  private constructor(
    private config: Config,
    private log: Logger,
    private fret: string,
    private string: number,
    private harmonic: boolean
  ) {}

  static create(config: Config, log: Logger, musicXML: { note: musicxml.Note }): TabPosition[] {
    const notehead = musicXML.note.getNotehead();
    const dead = notehead === 'cross' || notehead === 'x';

    return musicXML.note
      .getNotations()
      .flatMap((n) => n.getTechnicals())
      .flatMap((t) => {
        const frets = t
          .getFrets()
          .map((f) => f.getNumber())
          .map(String);
        const strings = t.getTabStrings().map((s) => s.getNumber());
        const harmonics = t.getHarmonics().map((h) => h.getType());

        const count = Math.min(frets.length, strings.length);
        const tabPositions = new Array<TabPosition>(count);

        for (let index = 0; index < count; index++) {
          const fret = dead ? 'X' : frets[index] ?? '0';
          const string = strings[index] ?? 1;
          const harmonic = harmonics[index] === 'natural' || harmonics[index] === 'artificial';
          tabPositions[index] = new TabPosition(config, log, fret, string, harmonic);
        }

        return tabPositions;
      });
  }

  static fromMdom(config: Config, log: Logger, mdom: { note: mdom.Note }): TabPosition[] {
    const note = mdom.note;
    const notehead = note.child('notehead')?.text ?? null;
    const dead = notehead === 'cross' || notehead === 'x';

    return note
      .childrenNamed('notations')
      .flatMap((n) => n.childrenNamed('technical'))
      .flatMap((t) => {
        const frets = t.childrenNamed('fret').map((f) => String(f.text != null ? parseInt(f.text, 10) : null));
        const strings = t.childrenNamed('string').map((s) => (s.text != null ? parseInt(s.text, 10) : null));
        const harmonics = t
          .childrenNamed('harmonic')
          .map((h) => (h.child('natural') ? 'natural' : h.child('artificial') ? 'artificial' : 'unspecified'));

        const count = Math.min(frets.length, strings.length);
        const tabPositions = new Array<TabPosition>(count);

        for (let index = 0; index < count; index++) {
          const fret = dead ? 'X' : frets[index] ?? '0';
          const string = strings[index] ?? 1;
          const harmonic = harmonics[index] === 'natural' || harmonics[index] === 'artificial';
          tabPositions[index] = new TabPosition(config, log, fret, string, harmonic);
        }

        return tabPositions;
      });
  }

  parse(): data.TabPosition {
    return {
      type: 'tabposition',
      fret: this.fret,
      string: this.string,
      harmonic: this.harmonic,
    };
  }
}

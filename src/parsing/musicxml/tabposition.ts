import * as data from '@/data';
import * as musicxml from '@/musicxml';

export class TabPosition {
  private constructor(private fret: string, private string: number, private harmonic: boolean) {}

  static create(musicXML: { note: musicxml.Note }): TabPosition[] {
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
          tabPositions[index] = new TabPosition(fret, string, harmonic);
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

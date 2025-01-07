import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { NoteContext } from './contexts';

export class Slur {
  constructor(
    private curveNumber: number,
    private placement: data.CurvePlacement,
    private opening: data.CurveOpening
  ) {}

  static fromMusicXML(musicXML: { slur: musicxml.Slur }): Slur {
    const curveNumber = musicXML.slur.getNumber();
    const placement = musicXML.slur.getPlacement() ?? 'auto';

    let opening: data.CurveOpening = 'auto';
    switch (musicXML.slur.getOrientation()) {
      // Yes, these translations are correct.
      case 'over':
        opening = 'down';
        break;
      case 'under':
        opening = 'up';
        break;
    }

    return new Slur(curveNumber, placement, opening);
  }

  parse(noteCtx: NoteContext): string {
    return '';
  }
}

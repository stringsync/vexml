import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import { Stave } from './stave';

type CreateOptions = {
  musicXml: {
    measure: musicxml.Measure;
  };
};

type RenderOptions = {
  ctx: vexflow.RenderContext;
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML.
 * A Measure contains a specific segment of musical content, defined by its beginning and ending beats,
 * and is the primary unit of time in a score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  static create(opts: CreateOptions): Measure {
    const attributes = opts.musicXml.measure.getAttributes();

    // TODO: Properly handle multiple <attributes>.
    const clefs = attributes.flatMap((attribute) => attribute.getClefs());
    const staffDetails = attributes.flatMap((attribute) => attribute.getStaffDetails());
    const notes = opts.musicXml.measure.getNotes();

    const staveCount = Math.max(1, ...attributes.map((attribute) => attribute.getStaveCount()));
    const staves = new Array<Stave>(staveCount);

    for (let staffNumber = 1; staffNumber <= staveCount; staffNumber) {
      staves[staffNumber - 1] = Stave.create({
        staffNumber,
        musicXml: {
          notes: notes.filter((note) => note.getStaffNumber() === staffNumber),
        },
        clefType: clefs.find((clef) => clef.getStaffNumber() === staffNumber)?.getClefType() ?? 'treble',
        staffType:
          staffDetails.find((staffDetail) => staffDetail.getNumber() === staffNumber)?.getStaffType() ?? 'regular',
      });
    }

    return new Measure(staves);
  }

  private staves: Stave[];

  private constructor(staves: Stave[]) {
    this.staves = staves;
  }

  render(opts: RenderOptions) {
    // noop
  }
}

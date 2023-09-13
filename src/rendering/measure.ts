import * as musicxml from '@/musicxml';
import { Stave, StaveRendering } from './stave';

export type MeasureRendering = {
  type: 'measure';
  staves: StaveRendering[];
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML.
 * A Measure contains a specific segment of musical content, defined by its beginning and ending beats,
 * and is the primary unit of time in a score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  static create(opts: {
    musicXml: {
      measure: musicxml.Measure;
    };
    previousMeasure: Measure | null;
  }): Measure {
    const attributes = opts.musicXml.measure.getAttributes();

    const staveCount = Math.max(1, ...attributes.map((attribute) => attribute.getStaveCount()));
    const staves = new Array<Stave>(staveCount);

    for (let staffNumber = 1; staffNumber <= staveCount; staffNumber++) {
      staves[staffNumber - 1] = Stave.create({
        staffNumber,
        musicXml: {
          measure: opts.musicXml.measure,
        },
      });
    }

    return new Measure({ staves, previousMeasure: opts.previousMeasure });
  }

  private static areModifiersEqual(measure1: Measure | null, measure2: Measure | null): boolean {
    if (!measure1 && measure2) {
      return false;
    }
    if (measure1 && !measure2) {
      return false;
    }
    if (!measure1 && !measure2) {
      return true;
    }

    const staves1 = measure1!.getStaves();
    const staves2 = measure2!.getStaves();
    if (staves1.length !== staves2.length) {
      return false;
    }

    for (let index = 0; index < staves1.length; index++) {
      const stave1 = staves1[index];
      const stave2 = staves2[index];

      const clefType1 = stave1.getClefType();
      const clefType2 = stave2.getClefType();
      if (clefType1 !== clefType2) {
        return false;
      }

      const timeSignature1 = stave1.getTimeSignature().toString();
      const timeSignature2 = stave2.getTimeSignature().toString();
      if (timeSignature1 !== timeSignature2) {
        return false;
      }

      const keySignature1 = stave1.getKeySignature();
      const keySignature2 = stave2.getKeySignature();
      if (keySignature1 !== keySignature2) {
        return false;
      }
    }

    return true;
  }

  private staves: Stave[];
  private previousMeasure: Measure | null;

  private constructor(opts: { staves: Stave[]; previousMeasure: Measure | null }) {
    this.staves = opts.staves;
    this.previousMeasure = opts.previousMeasure;
  }

  getWidth(partMeasureIndex: number): number {
    let width = this.getMinJustifyWidth();
    if (this.shouldRenderModifiers(partMeasureIndex)) {
      width += this.getModifiersWidth();
    }
    return width;
  }

  getStaves(): Stave[] {
    return this.staves;
  }

  render(opts: { x: number; y: number; partMeasureIndex: number }): MeasureRendering {
    const staveRenderings = new Array<StaveRendering>();

    for (const stave of this.staves) {
      const staveRendering = stave.render({
        x: opts.x,
        y: opts.y,
        // TODO: It seems like stave knows too much about
        width: this.getWidth(opts.partMeasureIndex),
        renderModifiers: this.shouldRenderModifiers(opts.partMeasureIndex),
      });
      staveRenderings.push(staveRendering);
    }

    return { type: 'measure', staves: staveRenderings };
  }

  private shouldRenderModifiers(partMeasureIndex: number): boolean {
    const isFirstMeasureInPart = partMeasureIndex === 0;
    const didModifiersChange = !Measure.areModifiersEqual(this, this.previousMeasure);
    return isFirstMeasureInPart || didModifiersChange;
  }

  private getMinJustifyWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getMinJustifyWidth()));
  }

  private getModifiersWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getModifiersWidth()));
  }
}

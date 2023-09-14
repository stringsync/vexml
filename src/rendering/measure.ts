import * as musicxml from '@/musicxml';
import { Stave, StaveRendering } from './stave';

const DEFAULT_STAFF_DISTANCE = 80;

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
  private staves: Stave[];
  private systemId: symbol;

  private constructor(opts: { staves: Stave[]; systemId: symbol }) {
    this.staves = opts.staves;
    this.systemId = opts.systemId;
  }

  static create(opts: {
    musicXml: {
      measure: musicxml.Measure;
    };
    systemId: symbol;
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

    return new Measure({ staves, systemId: opts.systemId });
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

    const staves1 = measure1!.staves;
    const staves2 = measure2!.staves;
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

  clone(): Measure {
    return new Measure({
      staves: this.staves.map((stave) => stave.clone()),
      systemId: this.systemId,
    });
  }

  setSystemId(systemId: symbol): this {
    this.systemId = systemId;
    return this;
  }

  getMinRequiredWidth(previousMeasure: Measure | null): number {
    let requiredWidth = this.getMinJustifyWidth();
    if (this.shouldRenderModifiers(previousMeasure)) {
      requiredWidth += this.getModifiersWidth();
    }

    return requiredWidth;
  }

  shouldRenderModifiers(previousMeasure: Measure | null): boolean {
    return this.systemId !== previousMeasure?.systemId || !Measure.areModifiersEqual(this, previousMeasure);
  }

  render(opts: {
    x: number;
    y: number;
    isLastSystem: boolean;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    previousMeasure: Measure | null;
    staffLayouts: musicxml.StaffLayout[];
  }): MeasureRendering {
    const staveRenderings = new Array<StaveRendering>();

    let y = opts.y;

    for (const stave of this.staves) {
      const renderModifiers = this.shouldRenderModifiers(opts.previousMeasure);

      let minRequiredMeasureWidth = this.getMinJustifyWidth();
      if (renderModifiers) {
        minRequiredMeasureWidth += this.getModifiersWidth();
      }

      if (!opts.isLastSystem) {
        const widthDeficit = opts.targetSystemWidth - opts.minRequiredSystemWidth;
        const widthFraction = minRequiredMeasureWidth / opts.minRequiredSystemWidth;
        const widthDelta = widthDeficit * widthFraction;

        minRequiredMeasureWidth += widthDelta;
      }

      const staveRendering = stave.render({
        x: opts.x,
        y,
        width: minRequiredMeasureWidth,
        renderModifiers: renderModifiers,
      });
      staveRenderings.push(staveRendering);

      const staffDistance =
        opts.staffLayouts.find((staffLayout) => staffLayout.staffNumber === staffLayout.staffNumber)?.staffDistance ??
        DEFAULT_STAFF_DISTANCE;

      y += staffDistance;
    }

    return { type: 'measure', staves: staveRenderings };
  }

  private getMinJustifyWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getMinJustifyWidth()));
  }

  private getModifiersWidth(): number {
    return Math.max(0, ...this.staves.map((stave) => stave.getModifiersWidth()));
  }
}

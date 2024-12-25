import * as data from '@/data';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';

export class StaveSignature {
  private constructor(
    private metronome: data.Metronome,
    private clefs: data.Clef[],
    private keySignatures: data.KeySignature[],
    private timeSignatures: data.TimeSignature[],
    private quarterNoteDivisions: data.QuarterNoteDivisions[]
  ) {}

  /** Returns a default StaveSignature  */
  static default() {
    return new StaveSignature({ bpm: 120 }, [], [], [], []);
  }

  private static defaultClef(partId: string, staveNumber: number): data.Clef {
    return { partId, staveNumber, sign: 'G', line: null, octaveChange: null };
  }

  private static defaultKeySignature(partId: string, staveNumber: number): data.KeySignature {
    return { partId, staveNumber, previousKeySignature: null, fifths: 0, mode: 'none' };
  }

  private static defaultTimeSignature(partId: string, staveNumber: number): data.TimeSignature {
    return { partId, staveNumber, components: [new util.Fraction(4, 4)] };
  }

  private static defaultQuarterNoteDivisions(): number {
    return 1;
  }

  updateWithAttributes(partId: string, musicXML: { attributes: musicxml.Attributes }): StaveSignature {
    const proposedClefs = new Array<data.Clef>();
    const proposedKeySignatures = new Array<data.KeySignature>();
    const proposedTimeSignatures = new Array<data.TimeSignature>();

    const clefStaveNumbers = new Set<number>();
    const keySignatureStaveNumbers = new Set<number>();
    const timeSignatureStaveNumbers = new Set<number>();

    for (const clef of musicXML.attributes.getClefs()) {
      const staveNumber = clef.getStaveNumber();

      if (clefStaveNumbers.has(staveNumber)) {
        continue;
      }

      clefStaveNumbers.add(staveNumber);
      proposedClefs.push({
        partId,
        staveNumber,
        sign: clef.getSign() ?? 'G',
        line: clef.getLine(),
        octaveChange: clef.getOctaveChange(),
      });
    }

    for (const key of musicXML.attributes.getKeys()) {
      const staveNumber = key.getStaveNumber();

      if (keySignatureStaveNumbers.has(staveNumber)) {
        continue;
      }

      keySignatureStaveNumbers.add(staveNumber);
      const previousKeySignature =
        proposedKeySignatures.find(
          (keySignature) => keySignature.partId === partId && keySignature.staveNumber === staveNumber
        ) ?? null;
      proposedKeySignatures.push({
        partId,
        staveNumber,
        previousKeySignature,
        fifths: key.getFifthsCount(),
        mode: key.getMode(),
      });
    }

    for (const time of musicXML.attributes.getTimes()) {
      const staveNumber = time.getStaveNumber();

      if (timeSignatureStaveNumbers.has(staveNumber)) {
        continue;
      }

      timeSignatureStaveNumbers.add(staveNumber);
      proposedTimeSignatures.push({
        partId,
        staveNumber,
        components: [new util.Fraction(4, 4)], // TODO: Implement time signature components
      });
    }

    const proposedDivisions = new Array<data.QuarterNoteDivisions>();
    if (musicXML.attributes.getQuarterNoteDivisions()) {
      proposedDivisions.push({ partId, value: musicXML.attributes.getQuarterNoteDivisions() });
    }

    // prettier-ignore
    const mergedClefs = [
      ...this.clefs.filter((clef) => !clefStaveNumbers.has(clef.staveNumber)),
      ...proposedClefs,
    ];
    const mergedKeySignatures = [
      ...this.keySignatures.filter((key) => !keySignatureStaveNumbers.has(key.staveNumber)),
      ...proposedKeySignatures,
    ];
    const mergedTimeSignatures = [
      ...this.timeSignatures.filter((time) => !timeSignatureStaveNumbers.has(time.staveNumber)),
      ...proposedTimeSignatures,
    ];
    const mergedQuarterNoteDivisions = [
      ...this.quarterNoteDivisions.filter((division) => division.partId !== partId),
      ...proposedDivisions,
    ];

    return new StaveSignature(
      this.metronome,
      mergedClefs,
      mergedKeySignatures,
      mergedTimeSignatures,
      mergedQuarterNoteDivisions
    );
  }

  updateWithMetronome(musicXML: {
    metronome: musicxml.Metronome;
    metronomeMark: musicxml.MetronomeMark;
  }): StaveSignature {
    const metronome: data.Metronome = {};

    metronome.parenthesis = musicXML.metronome.parentheses() ?? undefined;

    metronome.duration =
      conversions.fromNoteTypeToNoteDurationDenominator(musicXML.metronomeMark.left.unit) ?? undefined;
    metronome.dots = musicXML.metronomeMark.left.dotCount;

    switch (musicXML.metronomeMark.right.type) {
      case 'note':
        metronome.duration2 =
          conversions.fromNoteTypeToNoteDurationDenominator(musicXML.metronomeMark.right.unit) ?? undefined;
        metronome.dots2 = musicXML.metronomeMark.right.dotCount;
        break;
      case 'bpm':
        metronome.bpm = musicXML.metronomeMark.right.bpm;
        break;
    }

    return new StaveSignature(
      metronome,
      this.clefs,
      this.keySignatures,
      this.timeSignatures,
      this.quarterNoteDivisions
    );
  }

  getClef(partId: string, staveNumber: number): data.Clef {
    return (
      this.clefs.find((clef) => clef.partId === partId && clef.staveNumber === staveNumber) ??
      StaveSignature.defaultClef(partId, staveNumber)
    );
  }

  getKeySignature(partId: string, staveNumber: number): data.KeySignature {
    return (
      this.keySignatures.find((key) => key.partId === partId && key.staveNumber === staveNumber) ??
      StaveSignature.defaultKeySignature(partId, staveNumber)
    );
  }

  getTimeSignature(partId: string, staveNumber: number): data.TimeSignature {
    return (
      this.timeSignatures.find((time) => time.partId === partId && time.staveNumber === staveNumber) ??
      StaveSignature.defaultTimeSignature(partId, staveNumber)
    );
  }

  getQuarterNoteDivisions(partId: string): number {
    return (
      this.quarterNoteDivisions.find((division) => division.partId === partId)?.value ??
      StaveSignature.defaultQuarterNoteDivisions()
    );
  }

  asData(): data.StaveSignature {
    return {
      metronome: this.metronome,
      clefs: this.clefs,
      keySignatures: this.keySignatures,
      timeSignatures: this.timeSignatures,
      quarterNoteDivisions: this.quarterNoteDivisions,
    };
  }
}

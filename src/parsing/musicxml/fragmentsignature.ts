import * as data from '@/data';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';

/**
 * FragmentSignature represents attributes that create new measure fragments.
 *
 * It wraps {@link data.FragmentSignature} to provide convenience methods for updating the signature with new
 * {@link musicxml.Attributes} and {@link musicxml.MetronomeMark} elements.
 *
 * Measure fragments are necessary because there are some musical elements that have a 1:1 relationship with a vexflow
 * stave.
 */
export class FragmentSignature {
  private constructor(
    private metronome: data.Metronome,
    private clefs: data.Clef[],
    private keySignatures: data.KeySignature[],
    private timeSignatures: data.TimeSignature[],
    private staveLineCounts: data.StaveLineCount[]
  ) {}

  /** Returns a default FragmentSignature. */
  static default() {
    return new FragmentSignature({ bpm: 120 }, [], [], [], []);
  }

  static fromData(data: data.FragmentSignature): FragmentSignature {
    return new FragmentSignature(
      data.metronome,
      data.clefs,
      data.keySignatures,
      data.timeSignatures,
      data.staveLineCounts
    );
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

  updateWithAttributes(partId: string, musicXML: { attributes: musicxml.Attributes }): FragmentSignature {
    const proposedClefs = new Array<data.Clef>();
    const proposedKeySignatures = new Array<data.KeySignature>();
    const proposedTimeSignatures = new Array<data.TimeSignature>();
    const proposedStaveLineCounts = new Array<data.StaveLineCount>();

    const clefStaveNumbers = new Set<number>();
    const keySignatureStaveNumbers = new Set<number>();
    const timeSignatureStaveNumbers = new Set<number>();
    const staveLineCountStaveNumbers = new Set<number>();

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

    for (const staveDetail of musicXML.attributes.getStaveDetails()) {
      const staveNumber = staveDetail.getStaveNumber();

      if (staveLineCountStaveNumbers.has(staveNumber)) {
        continue;
      }

      staveLineCountStaveNumbers.add(staveNumber);
      proposedStaveLineCounts.push({
        partId,
        staveNumber,
        lineCount: staveDetail.getStaveLines(),
      });
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
    const mergedStaveLineCounts = [
      ...this.staveLineCounts.filter((staveLineCount) => !staveLineCountStaveNumbers.has(staveLineCount.staveNumber)),
      ...proposedStaveLineCounts,
    ];

    return new FragmentSignature(
      this.metronome,
      mergedClefs,
      mergedKeySignatures,
      mergedTimeSignatures,
      mergedStaveLineCounts
    );
  }

  updateWithMetronome(musicXML: {
    metronome: musicxml.Metronome;
    metronomeMark: musicxml.MetronomeMark;
  }): FragmentSignature {
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

    return new FragmentSignature(metronome, this.clefs, this.keySignatures, this.timeSignatures, this.staveLineCounts);
  }

  getClef(partId: string, staveNumber: number): data.Clef {
    return (
      this.clefs.find((clef) => clef.partId === partId && clef.staveNumber === staveNumber) ??
      FragmentSignature.defaultClef(partId, staveNumber)
    );
  }

  getKeySignature(partId: string, staveNumber: number): data.KeySignature {
    return (
      this.keySignatures.find((key) => key.partId === partId && key.staveNumber === staveNumber) ??
      FragmentSignature.defaultKeySignature(partId, staveNumber)
    );
  }

  getTimeSignature(partId: string, staveNumber: number): data.TimeSignature {
    return (
      this.timeSignatures.find((time) => time.partId === partId && time.staveNumber === staveNumber) ??
      FragmentSignature.defaultTimeSignature(partId, staveNumber)
    );
  }

  asData(): data.FragmentSignature {
    return {
      metronome: this.metronome,
      clefs: this.clefs,
      keySignatures: this.keySignatures,
      timeSignatures: this.timeSignatures,
      staveLineCounts: this.staveLineCounts,
    };
  }
}

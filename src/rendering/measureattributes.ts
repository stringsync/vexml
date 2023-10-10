import * as musicxml from '@/musicxml';
import { StaveModifier } from './stave';

export type StaveMap<T> = Record<string | number, T>;

/**
 * A utility class to account for <attributes> changes.
 *
 * Nil <attributes> values don't actually mean anything changed — it actually means use the previous value.
 */
export class MeasureAttributes {
  private measureIndex: number;
  private measureEntryIndex: number;
  private clefTypes: StaveMap<musicxml.ClefType>;
  private keySignatures: StaveMap<string>;
  private timeSignatures: StaveMap<musicxml.TimeSignature>;
  private quarterNoteDivisions: number;

  private constructor(opts: {
    measureIndex: number;
    measureEntryIndex: number;
    clefTypes: StaveMap<musicxml.ClefType>;
    keySignatures: StaveMap<string>;
    timeSignatures: StaveMap<musicxml.TimeSignature>;
    quarterNoteDivisions: number;
  }) {
    this.measureIndex = opts.measureIndex;
    this.measureEntryIndex = opts.measureEntryIndex;
    this.clefTypes = opts.clefTypes;
    this.keySignatures = opts.keySignatures;
    this.timeSignatures = opts.timeSignatures;
    this.quarterNoteDivisions = opts.quarterNoteDivisions;
  }

  /** Creates a new MeasureAttributes by selectively merging properties from its designated previous. */
  static merge(opts: {
    measureIndex: number;
    measureEntryIndex: number;
    previousMeasureAttributes: MeasureAttributes | null;
    xmlAttributes: musicxml.Attributes;
  }): MeasureAttributes {
    const clefTypes = {
      ...opts.previousMeasureAttributes?.clefTypes,
      ...opts.xmlAttributes
        .getClefs()
        .map((clef): [staveNumber: number, clefType: musicxml.ClefType | null] => [
          clef.getStaveNumber(),
          clef.getClefType(),
        ])
        .filter((clef): clef is [staveNumber: number, clefType: musicxml.ClefType] => !!clef[1])
        .reduce<StaveMap<musicxml.ClefType>>((map, [staveNumber, clefType]) => {
          map[staveNumber] = clefType;
          return map;
        }, {}),
    };

    const keySignatures = {
      ...opts.previousMeasureAttributes?.keySignatures,
      ...opts.xmlAttributes.getKeys().reduce<StaveMap<string>>((map, key) => {
        map[key.getStaveNumber()] = key.getKeySignature();
        return map;
      }, {}),
    };

    const timeSignatures = {
      ...opts.previousMeasureAttributes?.timeSignatures,
      ...opts.xmlAttributes
        .getTimes()
        .map((time): [staveNumber: number, timeSignature: musicxml.TimeSignature | null] => [
          time.getStaveNumber(),
          time.getTimeSignature(),
        ])
        .filter((time): time is [staveNumber: number, timeSignature: musicxml.TimeSignature] => !!time[1])
        .reduce<StaveMap<musicxml.TimeSignature>>((map, [staveNumber, timeSignature]) => {
          map[staveNumber] = timeSignature;
          return map;
        }, {}),
    };

    const quarterNoteDivisions = opts.xmlAttributes.getQuarterNoteDivisions();

    return new MeasureAttributes({
      measureIndex: opts.measureIndex,
      measureEntryIndex: opts.measureEntryIndex,
      clefTypes,
      keySignatures,
      timeSignatures,
      quarterNoteDivisions,
    });
  }

  /**
   * Returns the stave modifiers that _meaningfully_ changed.
   *
   * When one of the values is null for a given stave number, it does not indicate a change.
   */
  static diffStaveModifiers(
    measureAttributes1: MeasureAttributes,
    measureAttributes2: MeasureAttributes
  ): StaveModifier[] {
    const changed = new Set<StaveModifier>();

    for (const [staveNumber, clefType2] of Object.entries(measureAttributes2.clefTypes)) {
      const clefType1 = measureAttributes1.clefTypes[staveNumber];
      if (clefType1 && clefType1 !== clefType2) {
        changed.add('clefType');
      }
    }

    for (const [staveNumber, keySignature2] of Object.entries(measureAttributes2.keySignatures)) {
      const keySignature1 = measureAttributes1.keySignatures[staveNumber];
      if (keySignature1 && keySignature1 !== keySignature2) {
        changed.add('keySignature');
      }
    }

    for (const [staveNumber, timeSignature2] of Object.entries(measureAttributes2.timeSignatures)) {
      const timeSignature1 = measureAttributes1.timeSignatures[staveNumber];
      if (timeSignature1 && !timeSignature1.isEqual(timeSignature2)) {
        changed.add('timeSignature');
      }
    }

    return Array.from(changed);
  }

  /** Returns the measure index of the MeasureAttributes. */
  getMeasureIndex(): number {
    return this.measureIndex;
  }

  /** Returns the measure entry index that the MeasureAttributes appeared in. */
  getMeasureEntryIndex(): number {
    return this.measureEntryIndex;
  }

  /** Returns the clef corresponding to the stave number. */
  getClefType(staveNumber: number): musicxml.ClefType | null {
    return this.clefTypes[staveNumber] ?? null;
  }

  /** Returns the key signature corresponding to the stave number. */
  getKeySignature(staveNumber: number): string | null {
    return this.keySignatures[staveNumber] ?? null;
  }

  /** Returns how many divisions a quarter note has. */
  getQuarterNoteDivisions(): number {
    return this.quarterNoteDivisions;
  }

  /** Returns the time signature corresponding to the stave number. */
  getTimeSignature(staveNumber: number): musicxml.TimeSignature | null {
    return this.timeSignatures[staveNumber] ?? null;
  }
}

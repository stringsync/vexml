import * as musicxml from '@/musicxml';

type StaveMap<T> = Record<string | number, T>;

/**
 * A utility class to account for <attributes> changes.
 *
 * Nil <attributes> values don't actually mean anything changed — it actually means use the previous value.
 */
export class MeasureAttributes {
  private measureIndex: number;
  private measureEntryIndex: number;
  private clefs: StaveMap<musicxml.ClefType>;
  private keySignatures: StaveMap<string>;
  private timeSignatures: StaveMap<musicxml.TimeSignature>;

  private constructor(opts: {
    measureIndex: number;
    measureEntryIndex: number;
    clefs: StaveMap<musicxml.ClefType>;
    keySignatures: StaveMap<string>;
    timeSignatures: StaveMap<musicxml.TimeSignature>;
  }) {
    this.measureIndex = opts.measureIndex;
    this.measureEntryIndex = opts.measureEntryIndex;
    this.clefs = opts.clefs;
    this.keySignatures = opts.keySignatures;
    this.timeSignatures = opts.timeSignatures;
  }

  /** Creates a new MeasureAttributes by selectively merging properties from its designated previous. */
  static merge(opts: {
    measureIndex: number;
    measureEntryIndex: number;
    previousMeasureAttributes: MeasureAttributes | null;
    xmlAttributes: musicxml.Attributes;
  }): MeasureAttributes {
    const clefs = {
      ...opts.previousMeasureAttributes?.clefs,
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

    return new MeasureAttributes({
      measureIndex: opts.measureIndex,
      measureEntryIndex: opts.measureEntryIndex,
      clefs,
      keySignatures,
      timeSignatures,
    });
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
  getClef(staveNumber: number): musicxml.ClefType | null {
    return this.clefs[staveNumber] ?? null;
  }

  /** Returns the key signature corresponding to the stave number. */
  getKeySignature(staveNumber: number): string | null {
    return this.keySignatures[staveNumber] ?? null;
  }

  /** Returns the time signature corresponding to the stave number. */
  getTimeSignature(staveNumber: number): musicxml.TimeSignature | null {
    return this.timeSignatures[staveNumber] ?? null;
  }
}

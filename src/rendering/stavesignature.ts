import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { StaveModifier } from './stave';
import { KeySignature } from './keysignature';
import { Clef } from './clef';

/** Similar to `musicxml.MeasureEntry`, but with the `<attribute>` elements replaced with `StaveSignature` types. */
export type MeasureEntry = StaveSignature | Exclude<musicxml.Attributes, musicxml.MeasureEntry>;

type StaveMap<T> = { [staveNumber: number | string]: T };

/**
 * A utility class to account for <attributes> changes.
 *
 * It establishes a doubly-linked list connection with neighboring <attributes>.
 *
 * The name "attributes" isn't used because it has two main problems:
 *  - It's ambiguous. What "attributes" are we talking about?
 *  - It's inherently plural. What do you call an array of "attributes"?
 */
export class StaveSignature {
  private measureIndex: number;
  private measureEntryIndex: number;
  private clefs: StaveMap<Clef>;
  private keySignatures: StaveMap<KeySignature>;
  private timeSignatures: StaveMap<musicxml.TimeSignature>;
  private multiRestCounts: StaveMap<number>;
  private quarterNoteDivisions: number;
  private staveCount: number;
  private attributes: musicxml.Attributes;
  private previous: StaveSignature | null;
  private next: StaveSignature | null;

  private constructor(opts: {
    measureIndex: number;
    measureEntryIndex: number;
    clefs: StaveMap<Clef>;
    keySignatures: StaveMap<KeySignature>;
    timeSignatures: StaveMap<musicxml.TimeSignature>;
    multiRestCounts: StaveMap<number>;
    quarterNoteDivisions: number;
    staveCount: number;
    attributes: musicxml.Attributes;
  }) {
    this.measureIndex = opts.measureIndex;
    this.measureEntryIndex = opts.measureEntryIndex;
    this.clefs = opts.clefs;
    this.keySignatures = opts.keySignatures;
    this.timeSignatures = opts.timeSignatures;
    this.multiRestCounts = opts.multiRestCounts;
    this.quarterNoteDivisions = opts.quarterNoteDivisions;
    this.staveCount = opts.staveCount;
    this.attributes = opts.attributes;
    this.previous = null;
    this.next = null;
  }

  /** Creates a new StaveSignature by selectively merging properties from its designated previous. */
  static merge(opts: {
    measureIndex: number;
    measureEntryIndex: number;
    previousStaveSignature: StaveSignature | null;
    musicXml: {
      attributes: musicxml.Attributes;
    };
  }): StaveSignature {
    const previousStaveSignature = opts.previousStaveSignature;

    const clefs = {
      ...previousStaveSignature?.clefs,
      ...opts.musicXml.attributes
        .getClefs()
        .map((clef): [staveNumber: number, clef: Clef] => [clef.getStaveNumber(), Clef.from({ clef })])
        .reduce<StaveMap<Clef>>((map, [staveNumber, clef]) => {
          map[staveNumber] = clef;
          return map;
        }, {}),
    };

    const keySignatures = {
      ...previousStaveSignature?.keySignatures,
      ...opts.musicXml.attributes.getKeys().reduce<StaveMap<KeySignature>>((map, key) => {
        map[key.getStaveNumber()] = KeySignature.from({ key });
        return map;
      }, {}),
    };

    const timeSignatures = {
      ...previousStaveSignature?.timeSignatures,
      ...opts.musicXml.attributes
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

    const multiRestCounts = opts.musicXml.attributes
      .getMeasureStyles()
      .reduce<StaveMap<number>>((map, measureStyle) => {
        map[measureStyle.getStaveNumber()] = measureStyle.getMultipleRestCount();
        return map;
      }, {});

    const quarterNoteDivisions = opts.musicXml.attributes.getQuarterNoteDivisions();
    const staveCount = opts.musicXml.attributes.getStaveCount();
    const attributes = opts.musicXml.attributes;

    const staveSignature = new StaveSignature({
      measureIndex: opts.measureIndex,
      measureEntryIndex: opts.measureEntryIndex,
      clefs,
      keySignatures,
      timeSignatures,
      multiRestCounts,
      quarterNoteDivisions,
      staveCount,
      attributes,
    });

    staveSignature.previous = previousStaveSignature;
    if (previousStaveSignature) {
      previousStaveSignature.next = staveSignature;
    }

    return staveSignature;
  }

  /**
   * Returns the stave modifiers that _meaningfully_ changed.
   *
   * When one of the values is nil for a given stave number, it does not indicate a change. Instead, it signals that
   * the previous value should be used.
   */
  @util.memoize()
  getChangedStaveModifiers(): StaveModifier[] {
    if (!this.previous) {
      return ['clef', 'keySignature', 'timeSignature'];
    }

    const changed = new Set<StaveModifier>();

    for (const [staveNumber, clef] of Object.entries(this.clefs)) {
      const previousClef = this.previous.clefs[staveNumber];
      if (!previousClef.isEqual(clef)) {
        changed.add('clef');
      }
    }

    for (const [staveNumber, keySignature] of Object.entries(this.keySignatures)) {
      const previousKeySignature = this.previous.keySignatures[staveNumber];
      if (!previousKeySignature.isEqual(keySignature)) {
        changed.add('keySignature');
      }
    }

    for (const [staveNumber, timeSignature] of Object.entries(this.timeSignatures)) {
      const previousTimeSignature = this.previous.timeSignatures[staveNumber];
      if (!previousTimeSignature.isEqual(timeSignature)) {
        changed.add('timeSignature');
      }
    }

    return Array.from(changed);
  }

  /** Returns the previous stave signature. */
  getPrevious(): StaveSignature | null {
    return this.previous;
  }

  /** Returns the next stave signature. */
  getNext(): StaveSignature | null {
    return this.next;
  }

  /** Returns the measure index of the corresponding MeasureAttributes. */
  getMeasureIndex(): number {
    return this.measureIndex;
  }

  /** Returns the measure entry index that the corresponding MeasureAttributes appeared in. */
  getMeasureEntryIndex(): number {
    return this.measureEntryIndex;
  }

  /** Returns the clef corresponding to the stave number. */
  getClef(staveNumber: number): Clef | null {
    return this.clefs[staveNumber] ?? null;
  }

  /** Returns the key signature corresponding to the stave number. */
  getKeySignature(staveNumber: number): KeySignature | null {
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

  /** Returns the multiple rest count. */
  getMultiRestCount(staveNumber: number): number {
    return this.multiRestCounts[staveNumber] ?? 0;
  }

  /** Returns the number of staves the measure should have. */
  getStaveCount(): number {
    return this.staveCount;
  }

  /** Returns the <attributes> that corresponds to this stave signature. */
  getAttributes(): musicxml.Attributes {
    return this.attributes;
  }
}

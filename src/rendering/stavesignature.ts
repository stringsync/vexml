import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { StaveModifier } from './stave';
import { KeySignature, KeySignatureRendering } from './keysignature';
import { Clef, ClefRendering } from './clef';
import { TimeSignature, TimeSignatureRendering } from './timesignature';

/** The result of rendering a stave signature. */
export type StaveSignatureRendering = {
  type: 'stavesignature';
  staveNumber: number;
  clef: ClefRendering;
  keySignature: KeySignatureRendering;
  timeSignature: TimeSignatureRendering;
};

/** Similar to `musicxml.MeasureEntry`, but with the `<attribute>` elements replaced with `StaveSignature` types. */
export type MeasureEntry = StaveSignature | Exclude<musicxml.MeasureEntry, musicxml.Attributes>;

type StaveMap<T> = { [staveNumber: number | string]: T };

/**
 * A utility class to account for `<attributes>` changes.
 *
 * It establishes a doubly-linked list connection with neighboring `<attributes>`.
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
  private timeSignatures: StaveMap<TimeSignature>;
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
    timeSignatures: StaveMap<TimeSignature>;
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

  /** Creates a matrix of `StaveSignature` objects from a `musicxml.Part`, grouped by measure index. */
  static toMeasureEntryGroups(musicXml: { part: musicxml.Part }): MeasureEntry[][] {
    const result = new Array<MeasureEntry[]>();

    let previousStaveSignature: StaveSignature | null = null;

    const measures = musicXml.part.getMeasures();
    for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
      const measure = measures[measureIndex];

      result.push(new Array<MeasureEntry>());

      const entries = measure.getEntries();
      for (let measureEntryIndex = 0; measureEntryIndex < entries.length; measureEntryIndex++) {
        const entry = entries[measureEntryIndex];

        if (entry instanceof musicxml.Attributes) {
          const staveSignature = StaveSignature.merge({
            measureIndex,
            measureEntryIndex,
            previousStaveSignature,
            musicXml: { attributes: entry },
          });
          result[measureIndex].push(staveSignature);

          previousStaveSignature = staveSignature;
        } else {
          result[measureIndex].push(entry);
        }
      }
    }

    return result;
  }

  /** Creates a new StaveSignature by selectively merging properties from its designated previous. */
  private static merge(opts: {
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
        const staveNumber = key.getStaveNumber();
        const previousKeySignature = previousStaveSignature?.getKeySignature(staveNumber) ?? null;
        map[staveNumber] = KeySignature.from({ musicXml: { key }, previousKeySignature });
        return map;
      }, {}),
    };

    const timeSignatures = {
      ...previousStaveSignature?.timeSignatures,
      ...opts.musicXml.attributes
        .getTimes()
        .map((time): [staveNumber: number, timeSignature: TimeSignature | null] => [
          time.getStaveNumber(),
          TimeSignature.from({ time }),
        ])
        .filter((time): time is [staveNumber: number, timeSignature: TimeSignature] => !!time[1])
        .reduce<StaveMap<TimeSignature>>((map, [staveNumber, timeSignature]) => {
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

    // Make sure that the key signatures and time signatures have entries for each stave number.
    const staveCount = opts.musicXml.attributes.getStaveCount();
    for (let staveNumber = 1; staveNumber <= staveCount; staveNumber++) {
      if (!keySignatures[staveNumber]) {
        keySignatures[staveNumber] = keySignatures[1] ?? KeySignature.Cmajor();
      }
      if (!timeSignatures[staveNumber]) {
        timeSignatures[staveNumber] = timeSignatures[1] ?? TimeSignature.common();
      }
    }

    const quarterNoteDivisions = opts.musicXml.attributes.getQuarterNoteDivisions();
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
  getClef(staveNumber: number): Clef {
    return this.clefs[staveNumber] ?? Clef.treble();
  }

  /** Returns the key signature corresponding to the stave number. */
  getKeySignature(staveNumber: number): KeySignature {
    return this.keySignatures[staveNumber] ?? KeySignature.Cmajor();
  }

  /** Returns how many divisions a quarter note has. */
  getQuarterNoteDivisions(): number {
    return this.quarterNoteDivisions;
  }

  /** Returns the time signature corresponding to the stave number. */
  getTimeSignature(staveNumber: number): TimeSignature {
    return this.timeSignatures[staveNumber] ?? TimeSignature.common();
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

  /** Renders the stave signature. */
  render(opts: { staveNumber: number }): StaveSignatureRendering {
    return {
      type: 'stavesignature',
      staveNumber: opts.staveNumber,
      clef: this.getClef(opts.staveNumber).render(),
      keySignature: this.getKeySignature(opts.staveNumber).render(),
      timeSignature: this.getTimeSignature(opts.staveNumber).render(),
    };
  }
}

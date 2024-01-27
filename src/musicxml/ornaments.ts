import { NamedElement } from '@/util';
import * as util from '@/util';
import { AccidentalMark } from './accidentalmark';
import { WavyLine } from './wavyline';
import { TrillMark } from './trillmark';

/** A grouping of elements that fully define an ornament. */
export type OrnamentEntry<T> = {
  value: T;
  accidentalMarks: AccidentalMark[];
};

/**
 * Ornaments can be any of several types, followed optionally by accidentals.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ornaments/.
 */
export class Ornaments {
  constructor(private element: NamedElement<'ornaments'>) {}

  /** Returns trill mark entries. Defaults to an empty array. */
  getTrillMarks(): OrnamentEntry<TrillMark>[] {
    return this.getEntries('trill-mark').map((entry) => ({
      ...entry,
      value: new TrillMark(entry.value),
    }));
  }

  /** Returns the wavy lines of the ornaments. Defaults to an empty array. */
  getWavyLines(): OrnamentEntry<WavyLine>[] {
    return this.getEntries('wavy-line').map((entry) => ({
      ...entry,
      value: new WavyLine(entry.value),
    }));
  }

  private getEntries<T extends string>(name: T): OrnamentEntry<NamedElement<T>>[] {
    const entries = new Array<OrnamentEntry<NamedElement<T>>>();

    function startEntry(value: NamedElement<T>) {
      entries.push({ value, accidentalMarks: [] });
    }

    function addAccidentalMark(accidentalMark: AccidentalMark) {
      // Based on the `<ornament>` spec, we should always have an entry to add the accidental mark to. Otherwise, we
      // silently ignore it.
      util.last(entries)?.accidentalMarks.push(accidentalMark);
    }

    for (const child of this.element.children()) {
      if (child.isNamed(name)) {
        startEntry(child);
      }
      if (child.isNamed('accidental-mark')) {
        addAccidentalMark(new AccidentalMark(child));
      }
    }

    return entries;
  }
}

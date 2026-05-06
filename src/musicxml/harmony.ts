import { NamedElement } from '@/util';
import { CHORD_SYMBOL_DEGREE_TYPES, CHORD_SYMBOL_KINDS, ChordSymbolDegreeType, ChordSymbolKind } from './enums';

/**
 * The <harmony> element represents a chord symbol (e.g. "Cmaj7", "F#m7b5", "Bb/D"). It typically
 * appears inside a <measure> immediately before the <note> it anchors to.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/harmony/
 */
export class Harmony {
  constructor(private element: NamedElement<'harmony'>) {}

  /** Returns the root of the chord symbol, or null when missing or invalid. */
  getRoot(): HarmonyRoot | null {
    return this.getStepAndAlter('root');
  }

  /** Returns the kind of the chord symbol, or null when missing or invalid. */
  getKind(): HarmonyKind | null {
    const kind = this.element.first('kind');
    if (!kind) {
      return null;
    }
    const value = kind.content().enum(CHORD_SYMBOL_KINDS) ?? 'none';
    const text = kind.attr('text').str();
    return { value, text };
  }

  /** Returns the bass of the chord symbol, or null when missing. */
  getBass(): HarmonyBass | null {
    return this.getStepAndAlter('bass');
  }

  /** Returns the degree modifications of the chord symbol. */
  getDegrees(): HarmonyDegree[] {
    return this.element.children('degree').map((degree) => {
      const value = degree.first('degree-value')?.content().int() ?? 0;
      const alter = degree.first('degree-alter')?.content().float() ?? 0;
      const degreeType = degree.first('degree-type')?.content().enum(CHORD_SYMBOL_DEGREE_TYPES) ?? 'add';
      return { value, alter, degreeType };
    });
  }

  /** Returns the offset of the chord symbol in divisions, or null when missing. */
  getOffset(): number | null {
    return this.element.first('offset')?.content().float() ?? null;
  }

  private getStepAndAlter(parent: 'root' | 'bass'): { step: string; alter: number } | null {
    const node = this.element.first(parent);
    if (!node) {
      return null;
    }
    const step = node.first(`${parent}-step`)?.content().str() ?? null;
    if (!step) {
      return null;
    }
    const alter = node.first(`${parent}-alter`)?.content().float() ?? 0;
    return { step, alter };
  }
}

export type HarmonyRoot = {
  step: string;
  alter: number;
};

export type HarmonyKind = {
  value: ChordSymbolKind;
  text: string | null;
};

export type HarmonyBass = {
  step: string;
  alter: number;
};

export type HarmonyDegree = {
  value: number;
  alter: number;
  degreeType: ChordSymbolDegreeType;
};

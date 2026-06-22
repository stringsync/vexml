import * as data from '@/data';
import * as musicxml from '@/musicxml';
import type * as mdom from '@stringsync/mdom';
import { CHORD_SYMBOL_DEGREE_TYPES, CHORD_SYMBOL_KINDS } from '@/musicxml';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class ChordSymbol {
  private constructor(
    private config: Config,
    private log: Logger,
    private root: musicxml.HarmonyRoot | null,
    private kind: data.ChordSymbolKind,
    private kindText: string | null,
    private bass: musicxml.HarmonyBass | null,
    private degrees: musicxml.HarmonyDegree[]
  ) {}

  static create(config: Config, log: Logger, musicXML: { harmony: musicxml.Harmony }): ChordSymbol | null {
    const kind = musicXML.harmony.getKind();
    if (!kind) {
      return null;
    }

    if (musicXML.harmony.getOffset() !== null) {
      log.warn('<harmony> with <offset> is not supported; anchoring to next entry');
    }

    return new ChordSymbol(
      config,
      log,
      musicXML.harmony.getRoot(),
      kind.value,
      kind.text,
      musicXML.harmony.getBass(),
      musicXML.harmony.getDegrees()
    );
  }

  static fromMdom(config: Config, log: Logger, mdom: { harmony: mdom.MElement }): ChordSymbol | null {
    const harmony = mdom.harmony;

    const kindElement = harmony.child('kind');
    if (!kindElement) {
      return null;
    }
    const rawKind = kindElement.text;
    const kind: data.ChordSymbolKind = rawKind && CHORD_SYMBOL_KINDS.includes(rawKind) ? rawKind : 'none';
    const kindText = kindElement.getAttribute('text');

    if (harmony.child('offset')) {
      log.warn('<harmony> with <offset> is not supported; anchoring to next entry');
    }

    const stepAndAlter = (parent: 'root' | 'bass'): { step: string; alter: number } | null => {
      const node = harmony.child(parent);
      if (!node) {
        return null;
      }
      const step = node.child(`${parent}-step`)?.text ?? null;
      if (!step) {
        return null;
      }
      const rawAlter = node.child(`${parent}-alter`)?.text;
      return { step, alter: rawAlter != null ? parseFloat(rawAlter) : 0 };
    };

    const degrees = harmony.childrenNamed('degree').map((degree) => {
      const rawValue = degree.child('degree-value')?.text;
      const rawAlter = degree.child('degree-alter')?.text;
      const rawType = degree.child('degree-type')?.text;
      return {
        value: rawValue != null ? parseInt(rawValue, 10) : 0,
        alter: rawAlter != null ? parseFloat(rawAlter) : 0,
        degreeType:
          rawType && CHORD_SYMBOL_DEGREE_TYPES.includes(rawType) ? rawType : ('add' as data.ChordSymbolDegreeType),
      };
    });

    return new ChordSymbol(config, log, stepAndAlter('root'), kind, kindText, stepAndAlter('bass'), degrees);
  }

  parse(): data.ChordSymbol {
    return {
      type: 'chordsymbol',
      // <root> is required by spec, but for kind=none we still emit (e.g. N.C.) without one.
      root: this.root
        ? { type: 'chordsymbolroot', step: this.root.step, alter: this.root.alter }
        : { type: 'chordsymbolroot', step: '', alter: 0 },
      kind: this.kind,
      kindText: this.kindText,
      bass: this.bass ? { type: 'chordsymbolbass', step: this.bass.step, alter: this.bass.alter } : null,
      degrees: this.degrees.map((d) => ({
        type: 'chordsymboldegree',
        value: d.value,
        alter: d.alter,
        degreeType: d.degreeType,
      })),
    };
  }
}

import * as data from '@/data';
import * as musicxml from '@/musicxml';
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

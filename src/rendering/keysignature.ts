import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';
import { AccidentalCode } from './accidental';

const KEY_SIGNATURE_PADDING = 15;

const CIRCLE_OF_FIFTHS_SHARP = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const CIRCLE_OF_FIFTHS_FLAT = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** The result of rendering a key signature. */
export type KeySignatureRendering = {
  type: 'keysignature';
  vexflow: {
    keySignature: vexflow.KeySignature;
  };
};

/** Represents a key signature. */
export class KeySignature {
  private fifths: number;
  private mode: musicxml.KeyMode;
  private previousKeySignature: KeySignature | null;

  private constructor(opts: { fifths: number; mode: musicxml.KeyMode; previousKeySignature: KeySignature | null }) {
    this.fifths = opts.fifths;
    this.mode = opts.mode;
    this.previousKeySignature = opts.previousKeySignature;
  }

  static from(opts: { musicXML: { key: musicxml.Key }; previousKeySignature: KeySignature | null }) {
    const fifths = opts.musicXML.key.getFifthsCount();
    const mode = opts.musicXML.key.getMode();
    const previousKeySignature = opts.previousKeySignature;
    return new KeySignature({ fifths, mode, previousKeySignature });
  }

  static Cmajor(): KeySignature {
    return new KeySignature({ fifths: 0, mode: 'major', previousKeySignature: null });
  }

  /** Returns the root of the key signature. */
  @util.memoize()
  getKey(): string {
    // Clamp between -7 and 7 — the excess gets handled by alterations.
    let fifths = this.fifths;
    fifths = Math.max(-7, fifths);
    fifths = Math.min(7, fifths);

    switch (this.mode) {
      case 'major':
        return conversions.fromFifthsToMajorKey(fifths);
      case 'minor':
        return conversions.fromFifthsToMinorKey(fifths);
      default:
        return conversions.fromFifthsToMajorKey(fifths);
    }
  }

  /** Returns the alterations of the  key signature. */
  @util.memoize()
  getAlterations(): AccidentalCode[] {
    const alterations = new Array<AccidentalCode>();

    if (Math.abs(this.fifths) > 7) {
      const additional = Math.abs(this.fifths) - 7;
      for (let index = 0; index < additional; index++) {
        alterations.push(this.fifths > 0 ? '##' : 'bb');
      }
    }

    return alterations;
  }

  /** Returns the width of the key signature. */
  @util.memoize()
  getWidth(): number {
    return this.getVfKeySignature().getWidth() + KEY_SIGNATURE_PADDING;
  }

  /** Returns the accidental code being applied to the line that the pitch is on based on the key signature. */
  getAccidentalCode(pitch: string): AccidentalCode {
    // strip the accidental character (e.g., #, b) if any
    const root = pitch.charAt(0);

    if (this.fifths > 0) {
      const sharpCount = Math.min(this.fifths, 7);
      const sharps = CIRCLE_OF_FIFTHS_SHARP.slice(0, sharpCount);
      const sharpIndex = sharps.findIndex((sharp) => sharp === root);
      return sharpIndex < 0 ? 'n' : this.getAlterations()[sharpIndex] ?? '#';
    }

    if (this.fifths < 0) {
      const flatCount = Math.min(Math.abs(this.fifths), 7);
      const flats = CIRCLE_OF_FIFTHS_FLAT.slice(0, flatCount);
      const flatIndex = flats.findIndex((flat) => flat === root);
      return flatIndex < 0 ? 'n' : this.getAlterations()[flatIndex] ?? 'b';
    }

    return 'n';
  }

  /** Returns whether the key signatures are equal. */
  isEqual(other: KeySignature): boolean {
    return this.fifths === other.fifths && this.mode === other.mode;
  }

  /** Renders the key signature. */
  render(): KeySignatureRendering {
    return {
      type: 'keysignature',
      vexflow: {
        keySignature: this.getVfKeySignature(),
      },
    };
  }

  private getVfKeySignature(): vexflow.KeySignature {
    return new vexflow.KeySignature(
      this.getKey(),
      this.previousKeySignature?.getKey() ?? undefined,
      this.getAlterations()
    ).setPosition(vexflow.StaveModifierPosition.BEGIN);
  }
}

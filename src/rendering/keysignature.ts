import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
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

  static from(opts: { musicXml: { key: musicxml.Key }; previousKeySignature: KeySignature | null }) {
    const fifths = opts.musicXml.key.getFifthsCount();
    const mode = opts.musicXml.key.getMode();
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
        return this.toMajorKey(fifths);
      case 'minor':
        return this.toMinorKey(fifths);
      default:
        return this.toMajorKey(fifths);
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
    );
  }

  private toMajorKey(fifths: number): string {
    switch (fifths) {
      case -7:
        return 'Cb';
      case -6:
        return 'Gb';
      case -5:
        return 'Db';
      case -4:
        return 'Ab';
      case -3:
        return 'Eb';
      case -2:
        return 'Bb';
      case -1:
        return 'F';
      case 0:
        return 'C';
      case 1:
        return 'G';
      case 2:
        return 'D';
      case 3:
        return 'A';
      case 4:
        return 'E';
      case 5:
        return 'B';
      case 6:
        return 'F#';
      case 7:
        return 'C#';
      default:
        throw new Error(`cannot handle fifths: ${fifths}`);
    }
  }

  private toMinorKey(fifths: number): string {
    switch (fifths) {
      case -7:
        return 'Abm';
      case -6:
        return 'Ebm';
      case -5:
        return 'Bbm';
      case -4:
        return 'Fm';
      case -3:
        return 'Cm';
      case -2:
        return 'Gm';
      case -1:
        return 'Dm';
      case 0:
        return 'Am';
      case 1:
        return 'Em';
      case 2:
        return 'Bm';
      case 3:
        return 'F#m';
      case 4:
        return 'C#m';
      case 5:
        return 'G#m';
      case 6:
        return 'D#m';
      case 7:
        return 'A#m';
      default:
        throw new Error(`cannot handle fifths: ${fifths}`);
    }
  }
}

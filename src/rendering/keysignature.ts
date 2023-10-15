import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { AccidentalCode } from './accidental';

const CIRCLE_OF_FIFTHS_SHARP = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const CIRCLE_OF_FIFTHS_FLAT = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** Represents a key signature. */
export class KeySignature {
  private fifths: number;
  private mode: musicxml.KeyMode;

  private constructor(fifths: number, mode: musicxml.KeyMode) {
    this.fifths = fifths;
    this.mode = mode;
  }

  static from(musicXml: { key: musicxml.Key }) {
    const fifths = musicXml.key.getFifthsCount();
    const mode = musicXml.key.getMode();
    return new KeySignature(fifths, mode);
  }

  static Cmajor(): KeySignature {
    return new KeySignature(0, 'major');
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
    if (this.fifths !== other.fifths) {
      return false;
    }

    // See the implementation of KeySignature.getKey — we only fork for minor.
    if ((this.mode === 'minor' || other.mode === 'minor') && this.mode !== other.mode) {
      return false;
    }

    // Otherwise, all other modes are treated as major.
    return true;
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

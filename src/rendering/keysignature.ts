import * as musicxml from '@/musicxml';

/** Represents a key signature. */
export class KeySignature {
  private fifths: number;
  private mode: musicxml.KeyMode;

  constructor(fifths: number, mode: musicxml.KeyMode) {
    this.fifths = fifths;
    this.mode = mode;
  }

  static Cmajor(): KeySignature {
    return new KeySignature(0, 'major');
  }

  /** Returns the root of the key signature. */
  getKey(): string {
    // Clamp between -7 and 7 — the excess gets handled by alterations.
    let fifths = this.fifths;
    fifths = Math.max(-7, fifths);
    fifths = Math.min(7, fifths);

    switch (this.mode) {
      case 'major':
      case 'ionian':
        return this.toMajorKey(fifths);
      case 'minor':
      case 'aeolian':
        return this.toMinorKey(fifths);
      default:
        throw new Error(`cannot handle mode: ${this.mode}`);
    }
  }

  /** Returns the alterations of the  key signature. */
  getAlterations(): string[] {
    const alterations = new Array<string>();

    if (Math.abs(this.fifths) > 7) {
      const additional = Math.abs(this.fifths) - 7;
      for (let index = 0; index < additional; index++) {
        alterations.push(this.fifths > 0 ? '##' : 'bb');
      }
    }
    return alterations;
  }

  /** Returns whether the key signatures are equal. */
  isEqual(other: KeySignature): boolean {
    const root1 = this.getKey();
    const root2 = other.getKey();
    if (root1 !== root2) {
      return false;
    }

    const alterations1 = this.getAlterations();
    const alterations2 = other.getAlterations();
    if (alterations1.length !== alterations2.length) {
      return false;
    }
    for (let index = 0; index < alterations1.length; index++) {
      if (alterations1[index] !== alterations2[index]) {
        return false;
      }
    }

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

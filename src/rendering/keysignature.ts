import * as musicxml from '@/musicxml';
import * as util from '@/util';

const ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

// Used to align with
// https://github.com/0xfe/vexflow/blob/7e7eb97bf1580a31171302b3bd8165f057b692ba/tests/vexflow_test_helpers.ts#L399.
const MAJOR_ENHARMOICS: Record<string, string> = {};

// Used to align with
// https://github.com/0xfe/vexflow/blob/7e7eb97bf1580a31171302b3bd8165f057b692ba/tests/vexflow_test_helpers.ts#L417.
const MINOR_ENHARMONICS: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cb: 'B', // Though it's unusual to encounter this one
  'E#': 'F', // This is also quite rare
};

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
  @util.memoize()
  getKeySpec(): string {
    let root = this.fifths >= 0 ? ROOTS[this.fifths] : ROOTS[ROOTS.length + this.fifths];

    // Adjust root based on mode, since vexflow only understands major and minor modes.
    switch (this.mode) {
      case 'major':
      case 'ionian':
      case 'lydian':
      case 'mixolydian':
        return MAJOR_ENHARMOICS[root] || root;
      case 'minor':
      case 'aeolian':
        // Leverage vexflow's minor key signatures.
        return `${MINOR_ENHARMONICS[root] || root}m`;
      case 'dorian':
        // Transpose down by a whole step
        root = this.transposeRoot(root, -2);
        return MINOR_ENHARMONICS[root] || root;
      case 'phrygian':
        // Transpose down by a minor third
        root = this.transposeRoot(root, -3);
        return MINOR_ENHARMONICS[root] || root;
      case 'locrian':
        // Transpose down by a half step
        root = this.transposeRoot(root, -1);
        return MINOR_ENHARMONICS[root] || root;
      default:
        return root;
    }
  }

  /** Returns the alterations of the  key signature. */
  @util.memoize()
  getAlterations(): string[] {
    // TODO: Implement after hooking KeySignature into the rendering pipeline.
    return [];
  }

  /** Returns whether the key signatures are equal. */
  isEqual(other: KeySignature): boolean {
    const root1 = this.getKeySpec();
    const root2 = other.getKeySpec();
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

  /** Transposes the root by the number of half steps. */
  private transposeRoot(originalRoot: string, halfSteps: number): string {
    const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let index = roots.indexOf(originalRoot) + halfSteps;
    while (index < 0) index += 12; // Ensure index stays in range
    return roots[index % 12];
  }
}

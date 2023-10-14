import * as musicxml from '@/musicxml';
import * as util from '@/util';

const ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

/** Represents a key signature. */
export class KeySignature {
  private key: musicxml.Key;

  constructor(key: musicxml.Key) {
    this.key = key;
  }

  /** Returns the root of the key signature. */
  @util.memoize()
  getRoot(): string {
    const fifths = this.key.getFifthsCount();
    const mode = this.key.getMode();

    const root = fifths >= 0 ? ROOTS[fifths] : ROOTS[ROOTS.length + fifths];

    // Adjust root based on mode, since vexflow only understands major and minor modes.
    switch (mode) {
      case 'major':
      case 'ionian':
      case 'lydian':
      case 'mixolydian':
        return root;
      case 'minor':
      case 'aeolian':
        // Leverage vexflow's minor key signatures.
        return `${root}m`;
      case 'dorian':
        // Transpose down by a whole step
        return this.transposeRoot(root, -2);
      case 'phrygian':
        // Transpose down by a minor third
        return this.transposeRoot(root, -3);
      case 'locrian':
        // Transpose down by a half step
        return this.transposeRoot(root, -1);
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
    const root1 = this.getRoot();
    const root2 = other.getRoot();
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

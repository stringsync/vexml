import * as musicxml from '@/musicxml';
import { KeyMode } from './enums';

/** Represents a key signature. */
export class Key {
  constructor(
    private partId: string,
    private staveNumber: number,
    private fifths: number,
    private previousKeySignature: Key | null,
    private mode: KeyMode
  ) {}

  static default(partId: string, staveNumber: number): Key {
    return new Key(partId, staveNumber, 0, null, 'none');
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }

  getFifths(): number {
    return this.fifths;
  }

  getPreviousKeySignature(): Key | null {
    return this.previousKeySignature;
  }

  getMode(): KeyMode {
    return this.mode;
  }

  isEqual(keySignature: Key): boolean {
    return (
      this.partId === keySignature.getPartId() &&
      this.staveNumber === keySignature.getStaveNumber() &&
      this.isEquivalent(keySignature)
    );
  }

  isEquivalent(keySignature: Key): boolean {
    return (
      this.fifths === keySignature.getFifths() &&
      this.mode === keySignature.getMode() &&
      this.arePreviousKeySignaturesEquivalent(keySignature.previousKeySignature)
    );
  }

  private arePreviousKeySignaturesEquivalent(previousKeySignature: Key | null): boolean {
    if (!this.previousKeySignature && !previousKeySignature) {
      return true;
    }
    if (!this.previousKeySignature || !previousKeySignature) {
      return false;
    }
    return (
      this.previousKeySignature.fifths === previousKeySignature.fifths &&
      this.previousKeySignature.mode === previousKeySignature.mode
    );
  }
}

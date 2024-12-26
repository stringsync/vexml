import * as musicxml from '@/musicxml';
import { KeyMode } from './enums';

export class KeySignature {
  constructor(
    private partId: string,
    private staveNumber: number,
    private fifths: number,
    private previousKeySignature: KeySignature | null,
    private mode: KeyMode
  ) {}

  static default(partId: string, staveNumber: number): KeySignature {
    return new KeySignature(partId, staveNumber, 0, null, 'none');
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

  getPreviousKeySignature(): KeySignature | null {
    return this.previousKeySignature;
  }

  getMode(): KeyMode {
    return this.mode;
  }

  isEqual(keySignature: KeySignature): boolean {
    return (
      this.partId === keySignature.getPartId() &&
      this.staveNumber === keySignature.getStaveNumber() &&
      this.isEquivalent(keySignature)
    );
  }

  isEquivalent(keySignature: KeySignature): boolean {
    return (
      this.fifths === keySignature.getFifths() &&
      this.mode === keySignature.getMode() &&
      this.arePreviousKeySignaturesEquivalent(keySignature.previousKeySignature)
    );
  }

  merge(musicXML: { key: musicxml.Key }): KeySignature {
    return new KeySignature(this.partId, this.staveNumber, musicXML.key.getFifthsCount(), this, musicXML.key.getMode());
  }

  private arePreviousKeySignaturesEquivalent(previousKeySignature: KeySignature | null): boolean {
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

import * as musicxml from '@/musicxml';
import { KeyMode } from './enums';

/** Represents a key signature. */
export class Key {
  constructor(
    private partId: string,
    private staveNumber: number,
    private fifths: number,
    private previousKey: Key | null,
    private mode: KeyMode
  ) {}

  static default(partId: string, staveNumber: number): Key {
    return new Key(partId, staveNumber, 0, null, 'none');
  }

  static fromMusicXML(partId: string, previousKey: Key | null, musicXML: { key: musicxml.Key }): Key {
    return new Key(
      partId,
      musicXML.key.getStaveNumber(),
      musicXML.key.getFifthsCount(),
      previousKey,
      musicXML.key.getMode()
    );
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

  getPreviousKey(): Key | null {
    return this.previousKey;
  }

  getMode(): KeyMode {
    return this.mode;
  }

  isEqual(key: Key): boolean {
    return this.partId === key.getPartId() && this.staveNumber === key.getStaveNumber() && this.isEquivalent(key);
  }

  isEquivalent(key: Key): boolean {
    return (
      this.fifths === key.fifths && this.mode === key.mode && this.arePreviousKeySignaturesEquivalent(key.previousKey)
    );
  }

  private arePreviousKeySignaturesEquivalent(previousKey: Key | null): boolean {
    return this.previousKey?.fifths === previousKey?.fifths && this.previousKey?.mode === previousKey?.mode;
  }
}

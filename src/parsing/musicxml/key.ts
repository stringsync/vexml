import * as data from '@/data';
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

  parse(): data.Key {
    return {
      type: 'key',
      fifths: this.fifths,
      mode: this.mode,
      previousKey: this.parsePreviousKey(),
    };
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }

  isEqual(key: Key): boolean {
    return this.partId === key.partId && this.staveNumber === key.staveNumber && this.isEquivalent(key);
  }

  isEquivalent(key: Key): boolean {
    return (
      this.fifths === key.fifths && this.mode === key.mode && this.arePreviousKeySignaturesEquivalent(key.previousKey)
    );
  }

  private arePreviousKeySignaturesEquivalent(previousKey: Key | null): boolean {
    return this.previousKey?.fifths === previousKey?.fifths && this.previousKey?.mode === previousKey?.mode;
  }

  private parsePreviousKey(): data.PreviousKey | null {
    if (!this.previousKey) {
      return null;
    }
    return {
      type: 'previouskey',
      fifths: this.previousKey.fifths,
      mode: this.previousKey.mode,
    };
  }
}

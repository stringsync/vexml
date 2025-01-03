import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { KeyMode } from './enums';

const CIRCLE_OF_FIFTHS_SHARP = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const CIRCLE_OF_FIFTHS_FLAT = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

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
  /** Returns the accidental code being applied to the line that the pitch is on based on the key signature. */
  getAccidentalCode(pitch: string): data.AccidentalCode {
    // strip the accidental character (e.g., #, b) if any
    const root = pitch.charAt(0);

    const alterations = this.getAlterations();

    if (this.fifths > 0) {
      const sharpCount = Math.min(this.fifths, 7);
      const sharps = CIRCLE_OF_FIFTHS_SHARP.slice(0, sharpCount);
      const sharpIndex = sharps.findIndex((sharp) => sharp === root);
      return sharpIndex < 0 ? 'n' : alterations[sharpIndex] ?? '#';
    }

    if (this.fifths < 0) {
      const flatCount = Math.min(Math.abs(this.fifths), 7);
      const flats = CIRCLE_OF_FIFTHS_FLAT.slice(0, flatCount);
      const flatIndex = flats.findIndex((flat) => flat === root);
      return flatIndex < 0 ? 'n' : alterations[flatIndex] ?? 'b';
    }

    return 'n';
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

  /** Returns the alterations of the  key signature. */
  private getAlterations(): data.AccidentalCode[] {
    const alterations = new Array<data.AccidentalCode>();

    if (Math.abs(this.fifths) > 7) {
      const additional = Math.abs(this.fifths) - 7;
      for (let index = 0; index < additional; index++) {
        alterations.push(this.fifths > 0 ? '##' : 'bb');
      }
    }

    return alterations;
  }
}

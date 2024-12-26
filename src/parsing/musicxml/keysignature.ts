import { KeyMode } from './enums';

export class KeySignature {
  static default() {
    return new KeySignature();
  }

  getPartId(): string {
    return '';
  }

  getStaveNumber(): number {
    return 1;
  }

  getFifths(): number {
    return 0;
  }

  getPreviousKeySignature(): KeySignature | null {
    return null;
  }

  getMode(): KeyMode {
    return 'none';
  }
}

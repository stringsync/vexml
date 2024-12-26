import { ClefSign } from './enums';

export class Clef {
  static default() {
    return new Clef();
  }

  getPartId(): string {
    return '';
  }

  getStaveNumber(): number {
    return 1;
  }

  getLine(): number {
    return 1;
  }

  getSign(): ClefSign {
    return 'G';
  }

  getOctaveChange(): number | null {
    return null;
  }
}

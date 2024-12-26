import * as util from '@/util';

export class TimeSignature {
  static default() {
    return new TimeSignature();
  }

  getPartId(): string {
    return '';
  }

  getStaveNumber(): number {
    return 1;
  }

  getComponents(): util.Fraction[] {
    return [];
  }
}

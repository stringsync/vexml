import { StaveCount } from './stavecount';

export class PartSignature {
  constructor(private staveCount: StaveCount) {}

  getStaveCount(): number {
    return this.staveCount.getValue();
  }
}

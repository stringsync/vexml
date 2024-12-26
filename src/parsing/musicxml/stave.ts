import { Chorus } from './chorus';
import { MultiRest } from './multirest';

export class Stave {
  constructor(private number: number) {}

  getNumber(): number {
    return this.number;
  }

  getEntry(): Chorus | MultiRest {
    return new Chorus();
  }
}

import { Chorus } from './chorus';
import { MultiRest } from './multirest';
import { Signature } from './signature';

export class Stave {
  constructor(private number: number, private partId: string, private signature: Signature) {}

  getPartId(): string {
    return this.partId;
  }

  getNumber(): number {
    return this.number;
  }

  getSignature(): Signature {
    return this.signature;
  }

  getEntry(): Chorus | MultiRest {
    return new Chorus();
  }
}

import { Stave } from './stave';
import { PartSignature } from './partsignature';
import { Signature } from './signature';

export class Part {
  constructor(private id: string, private signature: Signature) {}

  getSignature(): PartSignature {
    return this.signature.asPartSignature(this.id);
  }

  getStaves(): Stave[] {
    return [];
  }
}

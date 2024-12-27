import { FragmentSignature } from './fragmentsignature';
import { Part } from './part';
import { Signature } from './signature';

export class Fragment {
  constructor(private signature: Signature) {}

  getSignature(): FragmentSignature {
    return this.signature.asFragmentSignature();
  }

  getParts(): Part[] {
    return [];
  }
}

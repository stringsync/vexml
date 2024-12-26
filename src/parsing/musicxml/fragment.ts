import { FragmentSignature } from './fragmentsignature';
import { Part } from './part';

export class Fragment {
  getSignature(): FragmentSignature | null {
    return null;
  }

  getParts(): Part[] {
    return [];
  }
}

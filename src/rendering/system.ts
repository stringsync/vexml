import { Document } from './document';
import * as elements from '@/elements';

export class System {
  constructor(private document: Document) {}

  render(): elements.System {
    throw new Error('Not implemented');
  }
}

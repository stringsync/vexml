import * as elements from '@/elements';
import { Logger } from '@/debug';
import { Sequence } from './sequence';

export class SequenceFactory {
  constructor(private log: Logger, private score: elements.Score) {}

  create(): Sequence[] {
    return [];
  }
}

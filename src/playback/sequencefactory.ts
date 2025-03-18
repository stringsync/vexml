import * as elements from '@/elements';
import { Logger } from '@/debug';
import { Sequence } from './sequence';

export class SequenceFactory {
  constructor(private log: Logger, private score: elements.Score) {}

  create(): Sequence[] {
    // TODO: Use real impl.
    return Array.from({ length: this.score.getPartCount() }, (_, i) => new Sequence(i, []));
  }
}

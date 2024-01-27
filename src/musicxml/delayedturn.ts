import { NamedElement } from '@/util';

/**
 * The `<delayed-turn>` element indicates a normal turn that is delayed until the end of the current note.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/delayed-turn/
 */
export class DelayedTurn {
  constructor(private element: NamedElement<'delayed-turn'>) {}
}

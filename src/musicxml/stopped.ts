import { NamedElement } from '@/util';

/**
 * The `<stopped>` element represents the stopped symbol, which looks like a plus sign.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/stopped/
 */
export class Stopped {
  constructor(private element: NamedElement<'stopped'>) {}
}

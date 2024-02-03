import { NamedElement } from '@/util';

/**
 * The `<toe>` element is used with organ pedals.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/toe/
 */
export class Toe {
  constructor(private element: NamedElement<'toe'>) {}
}

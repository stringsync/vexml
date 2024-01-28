import { NamedElement } from '@/util';

/**
 * The `<double-tongue>` element represents the double tongue symbol (two dots arranged horizontally).
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/double-tongue/
 */
export class DoubleTongue {
  constructor(private element: NamedElement<'double-tongue'>) {}
}

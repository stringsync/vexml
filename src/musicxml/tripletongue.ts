import { NamedElement } from '@/util';

/**
 * The `<triple-tongue>` element represents the triple tongue symbol (three dots arranged horizontally).
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/triple-tongue/
 */
export class TripleTongue {
  constructor(private element: NamedElement<'triple-tongue'>) {}
}

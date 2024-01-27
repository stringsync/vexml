import { NamedElement } from '@/util';

/**
 * The `<mordent>` element represents the sign with the vertical line.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/mordent/
 */
export class Mordent {
  constructor(private element: NamedElement<'mordent'>) {}
}

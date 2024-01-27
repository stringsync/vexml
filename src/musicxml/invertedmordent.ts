import { NamedElement } from '@/util';

/**
 * The `<inverted-mordent>` element represents the sign without the vertical line.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/inverted-mordent/
 */
export class InvertedMordent {
  constructor(private element: NamedElement<'inverted-mordent'>) {}
}

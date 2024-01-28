import { NamedElement } from '@/util';

/**
 * The `<fingernails>` element is used in notation for harp and other plucked string instruments.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/fingernails/
 */
export class Fingernails {
  constructor(private element: NamedElement<'fingernails'>) {}
}

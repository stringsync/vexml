import { NamedElement } from '@/util';

/**
 * The `<articulations>` element groups together articulations and accents.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/articulations/
 */
export class Articulations {
  constructor(private element: NamedElement<'articulations'>) {}
}

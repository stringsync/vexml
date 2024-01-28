import { NamedElement } from '@/util';

/**
 * The `<technical>` element groups together technical indications that give performance information for specific
 * instruments.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/technical/
 */
export class Technical {
  constructor(private element: NamedElement<'technical'>) {}
}

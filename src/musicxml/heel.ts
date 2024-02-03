import { NamedElement } from '@/util';

/**
 * The `<heel>` element is used with organ pedals.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/heel/
 */
export class Heel {
  constructor(private element: NamedElement<'heel'>) {}
}

import { NamedElement } from '@/util';
import { FERMATA_SHAPES, FERMATA_TYPES, FermataShape, FermataType } from './enums';

/**
 * The `<fermata>` element content represents the shape of the fermata sign.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/fermata/
 */
export class Fermata {
  constructor(private element: NamedElement<'fermata'>) {}

  /** Returns the shape of the fermata. Defaults to normal. */
  getShape(): FermataShape {
    return this.element.content().enum(FERMATA_SHAPES) ?? 'normal';
  }

  /** Returns the type of fermata. Defaults to upright. */
  getType(): FermataType {
    return this.element.attr('type').withDefault<FermataType>('upright').enum(FERMATA_TYPES);
  }
}

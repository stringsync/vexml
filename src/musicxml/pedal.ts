import { NamedElement } from '@/util';
import { PEDAL_TYPES, PedalType } from './enums';

/**
 * The <pedal> element represents piano pedal marks, including damper and sostenuto pedal marks.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/pedal/
 */
export class Pedal {
  constructor(private element: NamedElement<'pedal'>) {}

  /** Returns the type of pedal. Defaults to 'start'. */
  getType(): PedalType {
    return this.element.attr('type').withDefault<PedalType>('start').enum(PEDAL_TYPES);
  }
}

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

  /** Whether to show pedal signs. Defaults to false. */
  sign(): boolean {
    return this.element.attr('sign').str() === 'yes';
  }

  /** Whether to show pedal lines. Defaults to false. */
  line(): boolean {
    return this.element.attr('line').str() === 'yes';
  }
}

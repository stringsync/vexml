import { NamedElement } from '@/util';

/**
 * The `<up-bow>` element represents the symbol that is used both for up-bowing on bowed instruments, and up-stroke on
 * plucked instruments.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/up-bow/
 */
export class UpBow {
  constructor(private element: NamedElement<'up-bow'>) {}
}

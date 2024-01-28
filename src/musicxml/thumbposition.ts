import { NamedElement } from '@/util';

/**
 * The `<thumb-position>` element represents the thumb position symbol.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/thumb-position/
 */
export class ThumbPosition {
  constructor(private element: NamedElement<'thumb-position'>) {}
}

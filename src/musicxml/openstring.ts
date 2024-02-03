import { NamedElement } from '@/util';

/**
 * The `<open-string>` element represents the zero-shaped open string symbol.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/open-string/
 */
export class OpenString {
  constructor(private element: NamedElement<'open-string'>) {}
}

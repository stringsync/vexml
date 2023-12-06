import { NamedElement } from '../util';

export type PartDetail = {
  id: string;
  name: string;
};

/**
 * Identifies the different musical parts in this document.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/part-list/
 */
export class PartList {
  constructor(private element: NamedElement<'part-list'>) {}

  /** Returns detailed information about the parts.  */
  getPartDetails(): PartDetail[] {
    const result = new Array<PartDetail>();

    for (const scorePart of this.element.all('score-part')) {
      const id = scorePart.attr('id').withDefault('').str();
      const name = scorePart.first('part-name')?.content().str() ?? '';
      result.push({ id, name });
    }

    return result;
  }
}

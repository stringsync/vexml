import { NamedElement } from '@/util';

export class Words {
  constructor(private element: NamedElement<'words'>) {}

  /** Returns the content of the words. Defaults to empty string. */
  getContent(): string {
    return this.element.content().withDefault('').str();
  }
}

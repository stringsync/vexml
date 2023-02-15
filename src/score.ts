import { NamedNode } from './util/namednode';

export class Score {
  constructor(private node: NamedNode<'score-partwise'>) {}

  getPartCount(): number {
    return this.node.asElement().getElementsByTagName('score-part').length;
  }

  getPartIds(): string[] {
    const result = new Array<string>();
    const scoreParts = this.node.asElement().getElementsByTagName('score-part');
    for (const scorePart of scoreParts) {
      const id = scorePart.getAttribute('id');
      if (id) {
        result.push(id);
      }
    }
    return result;
  }

  getPartNames(): string[] {
    const result = new Array<string>();
    const partNames = this.node.asElement().getElementsByTagName('part-name');
    for (const partName of partNames) {
      const content = partName.textContent;
      if (content) {
        result.push(content);
      }
    }
    return result;
  }
}

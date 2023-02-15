import { Measure } from './measure';
import { NamedNode } from './util/namednode';

/** Score is the entrypoint of a MusicXML document. */
export class Score {
  constructor(private node: NamedNode<'score-partwise'>) {}

  /** Returns the part count in the score. */
  getPartCount(): number {
    return this.node.asElement().getElementsByTagName('score-part').length;
  }

  /** Returns an array of part IDs in the score in the order they appear. Each part ID should be unique. */
  getPartIds(): string[] {
    return Array.from(this.node.asElement().getElementsByTagName('score-part'))
      .filter((scorePart) => scorePart.hasAttribute('id'))
      .map((scorePart) => scorePart.getAttribute('id'))
      .filter((id): id is string => typeof id === 'string');
  }

  /** Returns an array of part names in the score in the order they appear. Part names can be duplicated. */
  getPartNames(): string[] {
    return Array.from(this.node.asElement().getElementsByTagName('part-name'))
      .map((partName) => partName.textContent)
      .filter((textContent): textContent is string => typeof textContent === 'string');
  }

  /** Returns an array of measures in the order they appear. */
  getMeasures(): Measure[] {
    return Array.from(this.node.asElement().getElementsByTagName('measure'))
      .map((measure) => NamedNode.of<'measure'>(measure))
      .map((node) => new Measure(node));
  }
}

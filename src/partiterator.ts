export class PartIteratorError extends Error {}

export class PartIterator {
  static fromString(musicXml: string): PartIterator {
    const parser = new DOMParser();
    const root = parser.parseFromString(musicXml, 'application/xml');
    return PartIterator.fromRoot(root);
  }

  static fromRoot(root: Document): PartIterator {
    const path = root.evaluate('/score-partwise/part', root, null, XPathResult.ANY_TYPE, null);
    return new PartIterator(path);
  }

  private path: XPathResult;
  private node: Node | null;

  private constructor(path: XPathResult) {
    this.path = path;
    this.node = path.iterateNext();
  }

  next(): Node {
    if (!this.node) {
      throw new PartIteratorError('cursor does not have value');
    }
    const node = this.node;
    this.node = this.path.iterateNext();
    return node;
  }

  hasNext(): boolean {
    return !!this.node;
  }
}

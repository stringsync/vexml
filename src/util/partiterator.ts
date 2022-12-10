export class PartIteratorError extends Error {}

export class PartIterator {
  static fromString(musicXml: string): PartIterator {
    const parser = new DOMParser();
    const root = parser.parseFromString(musicXml, 'application/xml');
    return PartIterator.fromRoot(root);
  }

  static fromRoot(root: Document): PartIterator {
    const path = root.evaluate('/score-partwise/part', root, null, XPathResult.ANY_TYPE, null);
    const node = path.iterateNext();
    return new PartIterator(path, node);
  }

  private constructor(private path: XPathResult, private current: Node | null) {}

  next(): Node {
    if (!this.current) {
      throw new PartIteratorError('cursor does not have value');
    }
    const node = this.current;
    this.current = this.path.iterateNext();
    return node;
  }

  hasNext(): boolean {
    return !!this.current;
  }
}

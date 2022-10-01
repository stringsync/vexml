export class CursorError extends Error {}

export class Cursor {
  static fromString(musicXml: string): Cursor {
    const parser = new DOMParser();
    const root = parser.parseFromString(musicXml, 'application/xml');
    return Cursor.fromRoot(root);
  }

  static fromRoot(root: Document): Cursor {
    const path = root.evaluate('/score-partwise/part', root, null, XPathResult.ANY_TYPE, null);
    return new Cursor(path);
  }

  private path: XPathResult;
  private node: Node | null;

  private constructor(path: XPathResult) {
    this.path = path;
    this.node = path.iterateNext();
  }

  next(): Node {
    if (!this.node) {
      throw new CursorError('cursor does not have value');
    }
    const node = this.node;
    this.node = this.path.iterateNext();
    return node;
  }

  hasNext(): boolean {
    return !!this.node;
  }
}

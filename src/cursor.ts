export class CursorError extends Error {}

export class Cursor {
  static fromMusicXml(musicXml: string): Cursor {
    const parser = new DOMParser();
    const root = parser.parseFromString(musicXml, 'application/xml');
    return Cursor.fromRoot(root);
  }

  static fromRoot(root: Document): Cursor {
    const path = root.evaluate('/score-partwise/part/measure', root, null, XPathResult.ANY_TYPE, null);

    const nodes = new Array<Node>();
    let node = path.iterateNext();
    while (node) {
      nodes.push(node);
      node = path.iterateNext();
    }

    return new Cursor(nodes);
  }

  private index = 0;
  private nodes: Node[] = [];

  private constructor(nodes: Node[]) {
    this.nodes = nodes;
  }

  next(): Node {
    if (!this.hasNext()) {
      throw new CursorError('cursor does not have value');
    }
    const node = this.nodes[this.index];
    this.index++;
    return node;
  }

  hasNext(): boolean {
    return this.index < this.nodes.length;
  }
}

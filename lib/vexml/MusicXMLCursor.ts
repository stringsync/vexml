export class MusicXMLCursor {
  static from(root: Document) {
    return new MusicXMLCursor(root);
  }

  private root: Document;
  private index = -1;
  private nodes: Node[] = [];

  private constructor(root: Document) {
    this.root = root;
    this.getPath('/score-partwise/part/measure');
  }

  getPath(path: string, origin?: Node): Node[] {
    var pathResult = this.root.evaluate(path, origin ?? this.root, null, XPathResult.ANY_TYPE, null);
    var node = pathResult.iterateNext();
    this.nodes = [];
    this.index = -1;
    while (node) {
        this.nodes.push(node);
        node = pathResult.iterateNext();
    } 
    return this.nodes;
  }
  
  get(): Node {
    if (!this.hasValue()) {
      throw new Error('cursor does not have value');
    }
    return this.nodes[this.index];
  }

  next(): void {
    if (!this.hasNext()) {
      throw new Error('cursor does not have next hasValue');
    }
    this.index++;
  }

  hasNext(): boolean {
    return this.index < this.nodes.length - 1;
  }

  private hasValue(): boolean {
    return this.index < this.nodes.length;
  }
}

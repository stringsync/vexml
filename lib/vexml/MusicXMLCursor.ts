import { MusicXMLParser } from './MusicXMLParser';
import { XMLNode } from './types';

export class MusicXMLCursor {
  static clefNode = Symbol('MusicXMLCursor.clefNode');
  static timeSignatureNode = Symbol('MusicXMLCursor.timeSignatureNode');
  static measureNode = Symbol('MusicXMLCursor.measureNode');

  static from(root: XMLNode) {
    if (root !== MusicXMLParser.parseResult) {
      throw new Error(
        `must use the dummy result from MusicXMLParser.parse, got: ${root}`
      );
    }
    return new MusicXMLCursor(root);
  }

  private root: XMLNode;
  private index = 0;
  private nodes = [
    MusicXMLCursor.clefNode,
    MusicXMLCursor.timeSignatureNode,
    MusicXMLCursor.measureNode,
  ];

  private constructor(root: XMLNode) {
    this.root = root;
  }

  get(): XMLNode {
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

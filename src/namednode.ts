/**
 * A wrapper class that is used to facilitate compile-time checking on a node's name.
 *
 * For example, requiring a signature to use NamedNode<'foo'> will force the caller to assert that a node's name is
 * foo. As long as types aren't being dynamically casted, this is also backed by the compiler.
 */
export class NamedNode<T extends string> {
  static of(node: Node): NamedNode<string> {
    return new NamedNode(node, node.nodeName);
  }

  private constructor(public readonly node: Node, public readonly name: T) {}

  isNamed<T extends string>(name: T): this is NamedNode<T> {
    return (this as any).name === name;
  }

  get(): Node {
    return this.node;
  }

  asElement(): Element {
    return this.node as Element;
  }
}

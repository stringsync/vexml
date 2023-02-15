/**
 * A wrapper class that is used to facilitate compile-time checking on a node's name.
 *
 * For example, requiring a signature to use NamedNode<'foo'> will force the caller to assert that a node's name is
 * foo. As long as types aren't being dynamically casted, this is also backed by the compiler.
 */
export class NamedNode<T extends string> {
  /** Creates a NamedNode from a document node. */
  static of<T extends string = string>(node: Node): NamedNode<T> {
    return new NamedNode(node, node.nodeName as T);
  }

  private constructor(public readonly node: Node, public readonly name: T) {}

  /** Returns the underlying node. */
  get(): Node {
    return this.node;
  }

  /** Determines if the node has the given name. */
  isNamed<S extends string>(name: S): this is NamedNode<S> {
    return (this as NamedNode<string>).name === name;
  }

  /** Casts the underlying node to an Element. */
  asElement(): Element {
    return this.node as Element;
  }
}

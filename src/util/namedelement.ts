import { Value } from './value';

/**
 * A readonly wrapper that enforces compile-time checking on an element's name.
 *
 * For example, requiring a signature to use NamedElement<'foo'> will force the caller to assert that an element's name
 * is foo. As long as types aren't being dynamically casted, this is also backed by the compiler.
 *
 * It also provides convenience methods on top of the Element API.
 */
export class NamedElement<T extends string> {
  private constructor(private readonly element: Element, public readonly name: T) {}

  /** Creates a NamedNode from a document node. */
  static of<T extends string = string>(element: Element): NamedElement<T> {
    return new NamedElement(element, element.nodeName as T);
  }

  /** Determines if the node has the given name. */
  isNamed<S extends string>(name: S): this is NamedElement<S> {
    return (this as NamedElement<string>).name === name;
  }

  /** Casts the underlying node to an Element. */
  native(): Element {
    return this.element;
  }

  children<S extends string>(...tagNames: S[]): Array<NamedElement<S>> {
    let nodes: Element[];

    if (tagNames.length === 0) {
      nodes = Array.from(this.element.children);
    } else {
      const selector = tagNames.map((tagName) => `:scope > ${tagName}`).join(', ');
      nodes = Array.from(this.element.querySelectorAll(selector));
    }

    return nodes.map((node) => NamedElement.of<S>(node));
  }

  /** Returns the first _descendant_ node matching the tag name. Defaults to null. */
  first<S extends string>(tagName: S): NamedElement<S> | null {
    const element = this.element.getElementsByTagName(tagName).item(0);
    return element ? NamedElement.of(element) : null;
  }

  /** Returns all _descendant_ node matching the tag name. */
  all<S extends string>(tagName: S): Array<NamedElement<S>> {
    return Array.from(this.element.getElementsByTagName(tagName)).map((node) => NamedElement.of<S>(node));
  }

  /** Returns the next _sibling_ node matching the tag name. */
  next<S extends string>(tagName: S): NamedElement<S> | null {
    let sibling = this.element.nextElementSibling;
    while (sibling) {
      const element = NamedElement.of(sibling);
      if (element.isNamed(tagName)) {
        return element;
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  /** Returns the previous _sibling_ node matching the tag name. */
  previous<S extends string>(tagName: S): NamedElement<S> | null {
    let sibling = this.element.previousElementSibling;
    while (sibling) {
      const element = NamedElement.of(sibling);
      if (element.isNamed(tagName)) {
        return element;
      }
      sibling = sibling.previousElementSibling;
    }
    return null;
  }

  /** Returns the _ancestor_ matching the tag name. Defaults to null. */
  ancestor<S extends string>(tagName: S): NamedElement<S> | null {
    let parent = this.element.parentElement;
    while (parent) {
      const element = NamedElement.of(parent);
      if (element.isNamed(tagName)) {
        return element;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  /** Returns an attr wrapper for the attribute of the given name. */
  attr(name: string): Value<null> {
    const value = this.element.getAttribute(name);
    return Value.of(value);
  }

  /** Returns the text content of the node. */
  content(): Value<null> {
    return Value.of(this.element.textContent || null)!;
  }
}

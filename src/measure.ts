import { NamedNode } from './namednode';

/** Measure is a basic musical data container that has notes and rests. */
export class Measure {
  constructor(private node: NamedNode<'measure'>) {}

  /** Returns the measure number or -1 if there was a problem parsing it. */
  getNumber(): number {
    const number = this.node.asElement().getAttribute('number');
    return this.parseIntOr(number, -1);
  }

  /** Returns whether or not the measure has a specified width */
  hasWidth(): boolean {
    return this.node.asElement().hasAttribute('width');
  }

  /** Returns the specified measured width in tenths or -1 if there was a problem parsing it. */
  getWidth(): number {
    const width = this.node.asElement().getAttribute('width');
    return this.parseIntOr(width, -1);
  }

  /** Returns the stave count in the measure or 1 if there was a problem parsing it. */
  getStaveCount(): number {
    const staves = this.node.asElement().getElementsByTagName('staves').item(0)?.textContent;
    return this.parseIntOr(staves, 1);
  }

  /** Parses a value into an integer and returns the fallback if there are any problems parsing it. */
  private parseIntOr(value: any, fallback: number): number {
    if (typeof value !== 'string') {
      return fallback;
    }

    const int = parseInt(value, 10);
    if (isNaN(int)) {
      return fallback;
    }

    return int;
  }
}

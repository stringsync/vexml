import { Fraction } from '@/util';
import * as util from '@/util';
import { TimeSymbol } from './enums';

export class TimeSignature {
  private constructor(private components: Fraction[], private symbol: TimeSymbol | null) {}

  /** Returns a normal TimeSignature, composed of two numbers. */
  static of(beatsPerMeasure: number, beatValue: number): TimeSignature {
    const components = [new Fraction(beatsPerMeasure, beatValue)];
    return new TimeSignature(components, null);
  }

  /** Returns a TimeSignature in cut time. */
  static cut(): TimeSignature {
    const components = [new Fraction(2, 2)];
    return new TimeSignature(components, 'cut');
  }

  /** Returns a TimeSignature in common time. */
  static common(): TimeSignature {
    const components = [new Fraction(4, 4)];
    return new TimeSignature(components, 'common');
  }

  /**
   * Returns a TimeSignature composed of many components.
   *
   * The parameter type signature ensures that there are at least two Fractions present.
   */
  static complex(components: Fraction[]): TimeSignature {
    return new TimeSignature(components, null);
  }

  /** Combines multiple time signatures into a single one, ignoring any symbols. */
  static combine(timeSignatures: TimeSignature[]): TimeSignature {
    const components = timeSignatures.flatMap((timeSignature) => timeSignature.components);
    return new TimeSignature(components, null);
  }

  /** Creates a new time signature that should be displayed as a single number. */
  static singleNumber(timeSignature: TimeSignature): TimeSignature {
    return new TimeSignature(timeSignature.components, 'single-number');
  }

  /** Returns whether the time signatures are equal. */
  isEqual(other: TimeSignature): boolean {
    const components1 = this.components;
    const components2 = other.components;

    if (components1.length !== components2.length) {
      return false;
    }

    // Components must also be in the same order, even if they are the same set of components.
    for (let index = 0; index < components1.length; index++) {
      const component1 = components1[index];
      const component2 = components2[index];
      if (!component1.isEqual(component2)) {
        return false;
      }
    }

    if (this.symbol !== other.symbol) {
      return false;
    }

    return true;
  }

  /** Returns the symbol of the time signature. */
  getSymbol(): TimeSymbol | null {
    return this.symbol;
  }

  /** Returns the components of the time signature. */
  getComponents(): Fraction[] {
    return this.components;
  }

  /** Clones the TimeSignature. */
  clone(): TimeSignature {
    return new TimeSignature(
      this.components.map(({ numerator, denominator }) => new Fraction(numerator, denominator)),
      this.symbol
    );
  }

  /** Returns a fraction that represents the combination of all */
  toFraction(): Fraction {
    const denominator = this.lcm();

    const numerator = util.sum(
      this.components.map((component) => {
        const factor = denominator / component.denominator;
        return factor * component.numerator;
      })
    );

    return new Fraction(numerator, denominator);
  }

  @util.memoize()
  private lcm() {
    let result = this.components[0].denominator;
    for (let index = 1; index < this.components.length; index++) {
      result = util.lcm(result, this.components[index].denominator);
    }
    return result;
  }
}

import { Config } from '@/config';
import * as debug from '@/debug';
import { Fraction } from '@/util';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

const COMPLEX_TIME_SIGNATURE_COMPONENT_PADDING = 12;

/** The result of rendering a time signature. */
export type TimeSignatureRendering = {
  type: 'timesignature';
  vexflow: {
    timeSignatures: vexflow.TimeSignature[];
  };
};

/** Represents a musical time signature. */
export class TimeSignature {
  private config: Config;
  private log: debug.Logger;
  private components: Fraction[];
  private symbol: musicxml.TimeSymbol | null;

  private constructor(opts: {
    config: Config;
    log: debug.Logger;
    components: Fraction[];
    symbol: musicxml.TimeSymbol | null;
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.components = opts.components;
    this.symbol = opts.symbol;
  }

  static fromMusicXML(opts: {
    config: Config;
    log: debug.Logger;
    musicXML: { time: musicxml.Time };
  }): TimeSignature | null {
    const { config, log } = opts;
    const time = opts.musicXML.time;
    if (time.isHidden()) {
      return TimeSignature.hidden({ config, log });
    }

    // The symbol overrides any other time specifications. This is done to avoid incompatible symbol and time signature
    // specifications.
    const symbol = time.getSymbol();
    switch (symbol) {
      case 'common':
        return TimeSignature.common({ config, log });
      case 'cut':
        return TimeSignature.cut({ config, log });
      case 'hidden':
        return TimeSignature.hidden({ config, log });
    }

    const beats = time.getBeats();
    const beatTypes = time.getBeatTypes();

    const timeSignatures = new Array<TimeSignature>();

    const len = Math.min(beats.length, beatTypes.length);
    for (let index = 0; index < len; index++) {
      const beatsPerMeasure = beats[index];
      const beatValue = beatTypes[index];
      const timeSignature = TimeSignature.parse({ config, log, beatsPerMeasure, beatValue });
      timeSignatures.push(timeSignature);
    }

    if (timeSignatures.length === 0) {
      return null;
    }
    if (symbol === 'single-number') {
      return TimeSignature.singleNumber({
        config,
        log,
        timeSignature: TimeSignature.combine({ config, log, timeSignatures }),
      });
    }
    if (timeSignatures.length === 1) {
      return timeSignatures[0];
    }
    return TimeSignature.combine({ config, log, timeSignatures });
  }

  /** Returns a normal TimeSignature, composed of two numbers. */
  static of(opts: { config: Config; log: debug.Logger; beatsPerMeasure: number; beatValue: number }): TimeSignature {
    const components = [new Fraction(opts.beatsPerMeasure, opts.beatValue)];
    return new TimeSignature({
      config: opts.config,
      log: opts.log,
      components,
      symbol: null,
    });
  }

  /** Returns a TimeSignature in cut time. */
  static cut(opts: { config: Config; log: debug.Logger }): TimeSignature {
    const components = [new Fraction(2, 2)];
    return new TimeSignature({
      config: opts.config,
      log: opts.log,
      components,
      symbol: 'cut',
    });
  }

  /** Returns a TimeSignature in common time. */
  static common(opts: { config: Config; log: debug.Logger }): TimeSignature {
    const components = [new Fraction(4, 4)];
    return new TimeSignature({
      config: opts.config,
      log: opts.log,
      components,
      symbol: 'common',
    });
  }

  /**
   * Returns a TimeSignature composed of many components.
   *
   * The parameter type signature ensures that there are at least two Fractions present.
   */
  static complex(opts: { config: Config; log: debug.Logger; components: Fraction[] }): TimeSignature {
    return new TimeSignature({
      config: opts.config,
      log: opts.log,
      components: opts.components,
      symbol: null,
    });
  }

  /** Combines multiple time signatures into a single one, ignoring any symbols. */
  static combine(opts: { config: Config; log: debug.Logger; timeSignatures: TimeSignature[] }): TimeSignature {
    const components = opts.timeSignatures.flatMap((timeSignature) => timeSignature.components);
    return new TimeSignature({
      config: opts.config,
      log: opts.log,
      components,
      symbol: null,
    });
  }

  /** Creates a new time signature that should be displayed as a single number. */
  static singleNumber(opts: { config: Config; log: debug.Logger; timeSignature: TimeSignature }): TimeSignature {
    return new TimeSignature({
      config: opts.config,
      log: opts.log,
      components: [opts.timeSignature.toFraction()],
      symbol: 'single-number',
    });
  }

  /**
   * Returns a TimeSiganture that should be hidden.
   *
   * NOTE: It contains time signature components, but purely to simplify rendering downstream. It shouldn't be used for
   * calculations.
   */
  static hidden(opts: { config: Config; log: debug.Logger }): TimeSignature {
    const components = [new Fraction(4, 4)];
    return new TimeSignature({
      config: opts.config,
      log: opts.log,
      components,
      symbol: 'hidden',
    });
  }

  private static parse(opts: {
    config: Config;
    log: debug.Logger;
    beatsPerMeasure: string;
    beatValue: string;
  }): TimeSignature {
    const { config, log, beatsPerMeasure, beatValue } = opts;

    const denominator = parseInt(beatValue.trim(), 10);
    const numerators = beatsPerMeasure.split('+').map((b) => parseInt(b.trim(), 10));

    if (numerators.length > 1) {
      const fractions = numerators.map((numerator) => new Fraction(numerator, denominator));
      return TimeSignature.complex({ config, log, components: fractions });
    }

    return TimeSignature.of({ config, log, beatsPerMeasure: numerators[0], beatValue: denominator });
  }

  /** Returns the width of the time signature.*/
  @util.memoize()
  getWidth(): number {
    const timeSpecs = this.getTimeSpecs();
    const padding = COMPLEX_TIME_SIGNATURE_COMPONENT_PADDING * (timeSpecs.length - 1);
    return padding + util.sum(timeSpecs.map((timeSpec) => new vexflow.TimeSignature(timeSpec).getWidth()));
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
  getSymbol(): musicxml.TimeSymbol | null {
    return this.symbol;
  }

  /** Returns the components of the time signature. */
  getComponents(): Fraction[] {
    return this.components;
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

  /** Renders the time signature. */
  render(): TimeSignatureRendering {
    const vfTimeSignatures = this.getTimeSpecs().map((timeSpec) => new vexflow.TimeSignature(timeSpec));

    return {
      type: 'timesignature',
      vexflow: {
        timeSignatures: vfTimeSignatures,
      },
    };
  }

  @util.memoize()
  private lcm() {
    let result = this.components[0].denominator;
    for (let index = 1; index < this.components.length; index++) {
      result = util.lcm(result, this.components[index].denominator);
    }
    return result;
  }

  @util.memoize()
  private getTimeSpecs(): string[] {
    switch (this.getSymbol()) {
      case 'common':
        return ['C'];
      case 'cut':
        return ['C|'];
      case 'single-number':
        // TODO: If/when vexflow supports this, return the time spec for a single number time signature.
        return [this.toSimpleTimeSpecs(this.toFraction())];
      case 'hidden':
        return [];
    }

    const components = this.getComponents();
    if (components.length > 1) {
      return this.toComplexTimeSpecs(components);
    }

    return [this.toSimpleTimeSpecs(components[0])];
  }

  private toSimpleTimeSpecs(component: util.Fraction): string {
    return `${component.numerator}/${component.denominator}`;
  }

  private toComplexTimeSpecs(components: util.Fraction[]): string[] {
    const denominators = new Array<number>();
    const memo: Record<number, number[]> = {};

    for (const component of components) {
      const numerator = component.numerator;
      const denominator = component.denominator;

      if (typeof memo[denominator] === 'undefined') {
        denominators.push(denominator);
      }

      memo[denominator] ??= [];
      memo[denominator].push(numerator);
    }

    const result = new Array<string>();

    for (let index = 0; index < denominators.length; index++) {
      const denominator = denominators[index];
      const isLast = index === denominators.length - 1;

      result.push(`${memo[denominator].join('+')}/${denominator}`);

      if (!isLast) {
        result.push('+');
      }
    }

    return result;
  }
}

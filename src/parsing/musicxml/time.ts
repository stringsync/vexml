import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Fraction } from './fraction';
import { Config } from '@/config';
import { Logger } from '@/debug';

/** Represents a musical time signature. */
export class Time {
  constructor(
    private config: Config,
    private log: Logger,
    private partId: string,
    private staveNumber: number,
    private components: util.Fraction[],
    private symbol: data.TimeSymbol | null
  ) {}

  static default(config: Config, log: Logger, partId: string, staveNumber: number) {
    return Time.common(config, log, partId, staveNumber);
  }

  static create(
    config: Config,
    log: Logger,
    partId: string,
    staveNumber: number,
    musicXML: { time: musicxml.Time }
  ): Time | null {
    const time = musicXML.time;

    if (time.isHidden()) {
      return Time.hidden(config, log, partId, staveNumber);
    }

    // The symbol overrides any other time specifications. This is done to avoid incompatible symbol and time signature
    // specifications.
    const symbol = time.getSymbol();
    switch (symbol) {
      case 'common':
        return Time.common(config, log, partId, staveNumber);
      case 'cut':
        return Time.cut(config, log, partId, staveNumber);
      case 'hidden':
        return Time.hidden(config, log, partId, staveNumber);
    }

    const beats = time.getBeats();
    const beatTypes = time.getBeatTypes();

    const times = new Array<Time>();

    const len = Math.min(beats.length, beatTypes.length);
    for (let index = 0; index < len; index++) {
      const beatsPerMeasure = beats[index];
      const beatValue = beatTypes[index];
      const nextTime = Time.parse(config, log, partId, staveNumber, beatsPerMeasure, beatValue);
      times.push(nextTime);
    }

    if (times.length === 0) {
      return null;
    }
    if (symbol === 'single-number') {
      return Time.singleNumber(config, log, partId, staveNumber, Time.combine(config, log, partId, staveNumber, times));
    }
    if (times.length === 1) {
      return times[0];
    }
    return Time.combine(config, log, partId, staveNumber, times);
  }

  /** Creates a Time for each stave. */
  static createMulti(
    config: Config,
    log: Logger,
    partId: string,
    staveCount: number,
    musicXML: { time: musicxml.Time }
  ): Array<Time | null> {
    const times = new Array<Time | null>();

    for (let index = 0; index < staveCount; index++) {
      const time = Time.create(config, log, partId, index + 1, musicXML);
      times.push(time);
    }

    return times;
  }

  /** Returns a simple Time, composed of two numbers. */
  static simple(
    config: Config,
    log: Logger,
    partId: string,
    staveNumber: number,
    beatsPerMeasure: number,
    beatValue: number
  ): Time {
    const components = [new util.Fraction(beatsPerMeasure, beatValue)];
    return new Time(config, log, partId, staveNumber, components, null);
  }

  /**
   * Returns a Time composed of many components.
   *
   * The parameter type signature ensures that there are at least two Fractions present.
   */
  static complex(config: Config, log: Logger, partId: string, staveNumber: number, components: util.Fraction[]): Time {
    return new Time(config, log, partId, staveNumber, components, null);
  }

  /**
   * Returns a Time that should be hidden.
   *
   * NOTE: It contains time signature components, but purely to simplify rendering downstream. It shouldn't be used for
   * calculations.
   */
  static hidden(config: Config, log: Logger, partId: string, staveNumber: number): Time {
    const components = [new util.Fraction(4, 4)];
    return new Time(config, log, partId, staveNumber, components, 'hidden');
  }

  /** Returns a Time in cut time. */
  static cut(config: Config, log: Logger, partId: string, staveNumber: number): Time {
    const components = [new util.Fraction(2, 2)];
    return new Time(config, log, partId, staveNumber, components, 'cut');
  }

  /** Returns a Time in common time. */
  static common(config: Config, log: Logger, partId: string, staveNumber: number): Time {
    const components = [new util.Fraction(4, 4)];
    return new Time(config, log, partId, staveNumber, components, 'common');
  }

  /** Combines multiple time signatures into a single one, ignoring any symbols. */
  static combine(config: Config, log: Logger, partId: string, staveNumber: number, times: Time[]): Time {
    const components = times.flatMap((time) => time.components);
    return new Time(config, log, partId, staveNumber, components, null);
  }

  /** Creates a new time signature that should be displayed as a single number. */
  static singleNumber(config: Config, log: Logger, partId: string, staveNumber: number, time: Time): Time {
    return new Time(config, log, partId, staveNumber, [time.toFraction()], 'single-number');
  }

  private static parse(
    config: Config,
    log: Logger,
    partId: string,
    staveNumber: number,
    beatsPerMeasure: string,
    beatValue: string
  ): Time {
    const denominator = parseInt(beatValue.trim(), 10);
    const numerators = beatsPerMeasure.split('+').map((b) => parseInt(b.trim(), 10));

    if (numerators.length > 1) {
      const fractions = numerators.map((numerator) => new util.Fraction(numerator, denominator));
      return Time.complex(config, log, partId, staveNumber, fractions);
    }

    return Time.simple(config, log, partId, staveNumber, numerators[0], denominator);
  }

  parse(): data.Time {
    return {
      type: 'time',
      symbol: this.symbol,
      components: this.getComponents().map((component) => component.parse()),
    };
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }

  /** Returns a fraction that represents the combination of all */
  toFraction(): util.Fraction {
    let sum = new util.Fraction(0, 1);
    for (const component of this.components) {
      sum = sum.add(component);
    }
    return sum.simplify();
  }

  isEqual(timeSignature: Time): boolean {
    return (
      this.partId === timeSignature.partId &&
      this.staveNumber === timeSignature.staveNumber &&
      this.isEquivalent(timeSignature)
    );
  }

  isEquivalent(timeSignature: Time): boolean {
    if (this.symbol !== timeSignature.symbol) {
      return false;
    }

    if (this.components.length !== timeSignature.components.length) {
      return false;
    }

    for (let i = 0; i < this.components.length; i++) {
      // We use isEqual instead of isEquivalent because they would be _displayed_ differently.
      if (!this.components[i].isEqual(timeSignature.components[i])) {
        return false;
      }
    }

    return true;
  }

  private getComponents(): Fraction[] {
    return this.components.map((component) => new Fraction(component));
  }
}

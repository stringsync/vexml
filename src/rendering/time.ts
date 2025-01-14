import * as vexflow from 'vexflow';
import * as data from '@/data';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { StaveKey, TimeRender } from './types';
import { Fraction } from '@/util';

const ADDITIONAL_COMPLEX_TIME_SIGNATURE_COMPONENT_WIDTH = 18;

export class Time {
  constructor(private config: Config, private log: Logger, private document: Document, private key: StaveKey) {}

  render(): TimeRender {
    const timeSpecs = this.getTimeSpecs();
    const vexflowTimeSignatures = timeSpecs.map((t) => new vexflow.TimeSignature(t));
    const padding = ADDITIONAL_COMPLEX_TIME_SIGNATURE_COMPONENT_WIDTH * (timeSpecs.length - 1);
    const width = vexflowTimeSignatures.reduce((sum, t) => sum + t.getWidth(), padding);

    return {
      type: 'time',
      rect: Rect.empty(), // placeholder
      key: this.key,
      vexflowTimeSignatures,
      width,
    };
  }

  private getTimeSpecs(): string[] {
    const time = this.document.getStave(this.key).signature.time;
    const components = this.toFractions(time.components);

    switch (time.symbol) {
      case 'common':
        return ['C'];
      case 'cut':
        return ['C|'];
      case 'single-number':
        const sum = Fraction.sum(...components).simplify();
        return [this.toSimpleTimeSpecs(sum)];
      case 'hidden':
        return [];
    }

    if (components.length > 1) {
      return this.toComplexTimeSpecs(components);
    }

    return [this.toSimpleTimeSpecs(components[0])];
  }

  private toSimpleTimeSpecs(component: Fraction): string {
    return `${component.numerator}/${component.denominator}`;
  }

  private toComplexTimeSpecs(components: Fraction[]): string[] {
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

  private toFractions(components: data.Fraction[]): Fraction[] {
    return components.map((component) => new Fraction(component.numerator, component.denominator));
  }
}

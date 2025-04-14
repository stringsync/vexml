import { PlaybackElement } from './types';
import * as elements from '@/elements';
import * as util from '@/util';

/**
 * Describes playback elements in a human readable format.
 */
export class ElementDescriber {
  private constructor(private elements: Map<PlaybackElement, number>) {}

  static create(score: elements.Score, partIndex: number): ElementDescriber {
    const elements = new Map<PlaybackElement, number>();

    score
      .getMeasures()
      .flatMap((measure) => measure.getFragments())
      .flatMap((fragment) => fragment.getParts().at(partIndex) ?? [])
      .flatMap((part) => part.getStaves())
      .flatMap((stave) => stave.getVoices())
      .flatMap((voice) => voice.getEntries())
      .forEach((element, index) => {
        elements.set(element, index);
      });

    return new ElementDescriber(elements);
  }

  describe(element: PlaybackElement): string {
    switch (element.name) {
      case 'note':
        return this.describeNote(element);
      case 'rest':
        return this.describeRest(element);
      case 'fragment':
        return this.describeFragment(element);
      case 'measure':
        return this.describeMeasure(element);
    }
  }

  private describeMeasure(element: elements.Measure): string {
    return `measure(${element.getAbsoluteMeasureIndex()})`;
  }

  private describeFragment(element: elements.Fragment): string {
    return '[fragment]';
  }

  private describeRest(element: elements.Rest): string {
    util.assert(this.elements.has(element), 'Expected element to be indexed');
    const index = this.elements.get(element)!;
    return `element(${index})`;
  }

  private describeNote(element: elements.Note): string {
    util.assert(this.elements.has(element), 'Expected element to be indexed');
    const index = this.elements.get(element)!;
    return `element(${index})`;
  }
}

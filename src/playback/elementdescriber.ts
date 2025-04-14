import { PlaybackElement } from './types';
import * as elements from '@/elements';
import * as util from '@/util';

/**
 * Describes playback elements in a human readable format.
 */
export class ElementDescriber {
  private constructor(private elements: Map<PlaybackElement, number>) {}

  static create(score: elements.Score, { partIndex }: { partIndex: number }): ElementDescriber {
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

  describe(element: PlaybackElement | elements.System | elements.Part): string {
    switch (element.name) {
      case 'part':
        return this.describePart(element);
      case 'system':
        return this.describeSystem(element);
      case 'note':
        return this.describeNote(element);
      case 'rest':
        return this.describeRest(element);
      case 'fragment':
        return this.describeFragment();
      case 'measure':
        return this.describeMeasure(element);
    }
  }

  private describePart(part: elements.Part): string {
    return `part(${part.getIndex()})`;
  }

  private describeSystem(system: elements.System): string {
    return `system(${system.getIndex()})`;
  }

  private describeMeasure(measure: elements.Measure): string {
    return `measure(${measure.getAbsoluteMeasureIndex()})`;
  }

  private describeFragment(): string {
    return 'fragment';
  }

  private describeRest(rest: elements.Rest): string {
    util.assert(this.elements.has(rest), 'Expected element to be indexed');
    const index = this.elements.get(rest)!;
    return `element(${index})`;
  }

  private describeNote(note: elements.Note): string {
    util.assert(this.elements.has(note), 'Expected element to be indexed');
    const index = this.elements.get(note)!;
    return `element(${index})`;
  }
}

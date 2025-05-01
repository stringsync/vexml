import { ElementDescriber } from './elementdescriber';
import { CursorStateHint } from './types';

export class HintDescriber {
  constructor(private elementDescriber: ElementDescriber) {}

  static noop(): HintDescriber {
    return new HintDescriber(ElementDescriber.noop());
  }

  describe(hint: CursorStateHint): string {
    switch (hint.type) {
      case 'start':
        return `start(${this.elementDescriber.describe(hint.element)})`;
      case 'stop':
        return `stop(${this.elementDescriber.describe(hint.element)})`;
      case 'retrigger':
        return `retrigger(${this.elementDescriber.describe(hint.untriggerElement)}, ${this.elementDescriber.describe(
          hint.retriggerElement
        )})`;
      case 'sustain':
        return `sustain(${this.elementDescriber.describe(hint.previousElement)}, ${this.elementDescriber.describe(
          hint.currentElement
        )})`;
    }
  }
}

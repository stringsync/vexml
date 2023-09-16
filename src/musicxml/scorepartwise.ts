import { NamedElement } from '@/util';
import { Defaults } from './defaults';
import { Part } from './part';

/**
 * ScorePartwise is the entrypoint of a MusicXML document.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/score-partwise/
 */
export class ScorePartwise {
  constructor(private element: NamedElement<'score-partwise'>) {}

  /** Returns the part count in the score. */
  getPartCount(): number {
    return this.element.all('score-part').length;
  }

  /** Returns an array of part IDs in the score in the order they appear. Each part ID should be unique. */
  getPartIds(): string[] {
    return this.element
      .all('score-part')
      .map((element) => element.attr('id').str())
      .filter((id): id is string => typeof id === 'string');
  }

  /** Returns an array of part names in the score in the order they appear. Part names can be duplicated. */
  getPartNames(): string[] {
    return this.element
      .all('part-name')
      .map((element) => element.content().str())
      .filter((content): content is string => typeof content === 'string');
  }

  /** Returns an array of parts in the order they appear. */
  getParts(): Part[] {
    return this.element.all('part').map((element) => new Part(element));
  }

  getDefaults(): Defaults | null {
    const defaults = this.element.first('defaults');
    return defaults ? new Defaults(defaults) : null;
  }
}

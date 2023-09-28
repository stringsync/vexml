import { NamedElement } from '../util';
import { SYLLABIC_TYPES, SyllabicType } from './enums';

export type LyricComponent =
  | { type: 'syllabic'; value: SyllabicType }
  | { type: 'text'; value: string }
  | { type: 'elision'; value: string };

/**
 * The <lyric> element represents text underlays for lyrics.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/lyric/
 */
export class Lyric {
  constructor(private element: NamedElement<'lyric'>) {}

  /** Returns the verse number the lyric belongs to. Defaults to 1. */
  getVerseNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /**
   * Returns the components of the lyric.
   *
   * This method assumes that the lyric children adhere to the MusicXML spec — it does not coerc values.
   */
  getComponents(): LyricComponent[] {
    const components = new Array<LyricComponent>();

    for (const child of this.element.native().children) {
      const element = NamedElement.of(child);

      if (element.isNamed('syllabic')) {
        components.push(this.createSyllabic(element));
      } else if (element.isNamed('text')) {
        components.push(this.createText(element));
      } else if (element.isNamed('elision')) {
        components.push(this.createElision(element));
      }
    }

    return components;
  }

  private createSyllabic(syllabic: NamedElement<'syllabic'>): Extract<LyricComponent, { type: 'syllabic' }> {
    const value = syllabic
      .content()
      .withDefault('single' as SyllabicType)
      .enum(SYLLABIC_TYPES);
    return { type: 'syllabic', value };
  }

  private createText(text: NamedElement<'text'>): Extract<LyricComponent, { type: 'text' }> {
    const value = text.content().withDefault('').str();
    return { type: 'text', value };
  }

  private createElision(elision: NamedElement<'elision'>): Extract<LyricComponent, { type: 'elision' }> {
    const value = elision.content().withDefault('').str();
    return { type: 'elision', value };
  }
}

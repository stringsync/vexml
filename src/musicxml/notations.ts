import { VerticalDirection, VERTICAL_DIRECTIONS } from './enums';
import { NamedElement } from '@/util';
import { Tuplet } from './tuplet';
import { Slur } from './slur';
import { Ornaments } from './ornaments';
import { Tied } from './tied';
import { Fermata } from './fermata';
import { Articulations } from './articulations';
import { AccidentalMark } from './accidentalmark';
import { Technical } from './technical';
import { Slide } from './slide';

/**
 * Musical notations that apply to a specific note or chord.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/notations/
 */
export class Notations {
  constructor(private element: NamedElement<'notations'>) {}

  /** Whether or not the note/chord is arpeggiated. */
  isArpeggiated(): boolean {
    return this.element.all('arpeggiate').length > 0;
  }

  /** Returns the direction of the arppegio. Defaults to null. */
  getArpeggioDirection(): VerticalDirection | null {
    return this.element.first('arpeggiate')?.attr('direction').enum(VERTICAL_DIRECTIONS) ?? null;
  }

  /** Whether the notations has at least one tuplet. */
  hasTuplets(): boolean {
    return this.element.all('tuplet').length > 0;
  }

  /** Returns the tuplets of the notations. Defaults to an empty array. */
  getTuplets(): Tuplet[] {
    return this.element.all('tuplet').map((element) => new Tuplet(element));
  }

  /** Returns the slurs of the notations. Defaults to an empty array. */
  getSlurs(): Slur[] {
    return this.element.all('slur').map((element) => new Slur(element));
  }

  /** Returns the tieds of the notations. Defaults to an empty array. */
  getTieds(): Tied[] {
    return this.element.all('tied').map((element) => new Tied(element));
  }

  /** Returns the ornaments of the notations. Defaults to an empty array. */
  getOrnaments(): Ornaments[] {
    return this.element.all('ornaments').map((element) => new Ornaments(element));
  }

  /** Returns the fermatas of the notations. Defaults to an empty array. */
  getFermatas(): Fermata[] {
    return this.element.all('fermata').map((element) => new Fermata(element));
  }

  /** Returns the articulations of the notations. Defaults to an empty array. */
  getArticulations(): Articulations[] {
    return this.element.all('articulations').map((element) => new Articulations(element));
  }

  /** Returns the accidental marks of the notations (not ornaments). */
  getAccidentalMarks(): AccidentalMark[] {
    return this.element.children('accidental-mark').map((element) => new AccidentalMark(element));
  }

  /** Returns the technicals of the notations. */
  getTechnicals(): Technical[] {
    return this.element.children('technical').map((element) => new Technical(element));
  }

  /** Returns the slides of the notations. */
  getSlides(): Slide[] {
    return this.element.children('slide').map((element) => new Slide(element));
  }
}

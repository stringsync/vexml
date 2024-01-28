import { NamedElement } from '@/util';
import { UpBow } from './upbow';
import { DownBow } from './downbow';
import { Harmonic } from './harmonic';
import { OpenString } from './openstring';
import { ThumbPosition } from './thumbposition';
import { Fingering } from './fingering';
import { Pluck } from './pluck';
import { DoubleTongue } from './doubletongue';
import { TripleTongue } from './tripletongue';
import { Stopped } from './stopped';
import { SnapPizzicato } from './snappizzicato';
import { Fret } from './fret';
import { TabString } from './tabstring';
import { HammerOn } from './hammeron';
import { PullOff } from './pulloff';
import { Bend } from './bend';
import { Tap } from './tap';
import { Heel } from './heel';
import { Toe } from './toe';
import { Fingernails } from './fingernails';

/**
 * The `<technical>` element groups together technical indications that give performance information for specific
 * instruments.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/technical/
 */
export class Technical {
  constructor(private element: NamedElement<'technical'>) {}

  /** Returns the up-bows of the technical. */
  getUpBows(): UpBow[] {
    return this.element.children('up-bow').map((element) => new UpBow(element));
  }

  /** Returns the down-bows of the technical. */
  getDownBows(): DownBow[] {
    return this.element.children('down-bow').map((element) => new DownBow(element));
  }

  /** Returns the harmonics of the technical. */
  getHarmonics(): Harmonic[] {
    return this.element.children('harmonic').map((element) => new Harmonic(element));
  }

  /** Returns the open strings of the technical. */
  getOpenStrings(): OpenString[] {
    return this.element.children('open-string').map((element) => new OpenString(element));
  }

  /** Returns the thumb positions of the technical. */
  getThumbPositions(): ThumbPosition[] {
    return this.element.children('thumb-position').map((element) => new ThumbPosition(element));
  }

  /** Returns the fingering of the technical. */
  getFingerings(): Fingering[] {
    return this.element.children('fingering').map((element) => new Fingering(element));
  }

  /** Returns the plucks of the technical. */
  getPlucks(): Pluck[] {
    return this.element.children('pluck').map((element) => new Pluck(element));
  }

  /** Returns the double tongues of the technical. */
  getDoubleTongues(): DoubleTongue[] {
    return this.element.children('double-tongue').map((element) => new DoubleTongue(element));
  }

  /** Returns the triple tongues of the technical. */
  getTripleTongues(): TripleTongue[] {
    return this.element.children('triple-tongue').map((element) => new TripleTongue(element));
  }

  /** Returns the stopped of the technical. */
  getStopped(): Stopped[] {
    return this.element.children('stopped').map((element) => new Stopped(element));
  }

  /** Returns the snap pizzicatos of the technical. */
  getSnapPizzicatos(): SnapPizzicato[] {
    return this.element.children('snap-pizzicato').map((element) => new SnapPizzicato(element));
  }

  /** Returns the frets of the technical. */
  getFrets(): Fret[] {
    return this.element.children('fret').map((element) => new Fret(element));
  }

  /** Returns the tab strings of the technical. */
  getTabStrings(): TabString[] {
    return this.element.children('string').map((element) => new TabString(element));
  }

  /** Returns the hammer-ons of the technical. */
  getHammerOns(): HammerOn[] {
    return this.element.children('hammer-on').map((element) => new HammerOn(element));
  }

  /** Returns the pull-offs of the technical. */
  getPulloffs(): PullOff[] {
    return this.element.children('pull-off').map((element) => new PullOff(element));
  }

  /** Returns the bends of the technical. */
  getBends(): Bend[] {
    return this.element.children('bend').map((element) => new Bend(element));
  }

  /** Returns the taps of the technical. */
  getTaps(): Tap[] {
    return this.element.children('tap').map((element) => new Tap(element));
  }

  /** Returns the heels of the technical. */
  getHeels(): Heel[] {
    return this.element.children('heel').map((element) => new Heel(element));
  }

  /** Returns the toes of the technical. */
  getToes(): Toe[] {
    return this.element.children('toe').map((element) => new Toe(element));
  }

  /** Returns the fingernails of the technical. */
  getFingernails(): Fingernails[] {
    return this.element.children('fingernails').map((element) => new Fingernails(element));
  }
}

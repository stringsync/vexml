import { NamedElement } from '@/util';
import { ABOVE_BELOW, AboveBelow } from './enums';

/** Indicates a regular horizontal accent mark. */
export type Accent = {
  type: 'accent';
  placement: AboveBelow | null;
};

/** Indicates a bold horizontal accent mark. */
export type StrongAccent = {
  type: 'strongaccent';
  placement: AboveBelow | null;
};

/** Represents a staccato mark. */
export type Staccato = {
  type: 'staccato';
  placement: AboveBelow | null;
};

/** Represents a tenuto mark. */
export type Tenuto = {
  type: 'tenuto';
  placement: AboveBelow | null;
};

/** Represents a staccatissimo mark. */
export type Staccatissimo = {
  type: 'staccatissimo';
  placement: AboveBelow | null;
};

/**
 * The `<articulations>` element groups together articulations and accents.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/articulations/
 */
export class Articulations {
  constructor(private element: NamedElement<'articulations'>) {}

  /** Returns the accent articulations. */
  getAccents(): Accent[] {
    return this.element.all('accent').map((element) => ({
      type: 'accent',
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }

  /** Returns the strong accent articulations. */
  getStrongAccents(): StrongAccent[] {
    return this.element.all('strong-accent').map((element) => ({
      type: 'strongaccent',
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }

  /** Returns the staccato articulations. */
  getStaccatos(): Staccato[] {
    return this.element.all('staccato').map((element) => ({
      type: 'staccato',
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }

  /** Returns the tenuto articulations. */
  getTenutos(): Tenuto[] {
    return this.element.all('tenuto').map((element) => ({
      type: 'tenuto',
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }

  /** Returns the staccatissimo articulations. */
  getStaccatissimos(): Staccatissimo[] {
    return this.element.all('staccatissimo').map((element) => ({
      type: 'staccatissimo',
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }
}

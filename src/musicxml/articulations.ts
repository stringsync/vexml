import { NamedElement } from '@/util';
import { ABOVE_BELOW, AboveBelow, LINE_TYPES, LineType } from './enums';

// Articulations were expressed as types instead of classes because there is a lot of overlap between them.

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

/** Represents a detached legato mark. */
export type DetachedLegato = {
  type: 'detachedlegato';
  placement: AboveBelow | null;
};

/** Represents a staccatissimo mark. */
export type Staccatissimo = {
  type: 'staccatissimo';
  placement: AboveBelow | null;
};

/** Represents a scoop mark. */
export type Scoop = {
  type: 'scoop';
  lineType: LineType;
  placement: AboveBelow | null;
};

/** Represents a plop mark. */
export type Plop = {
  type: 'plop';
  lineType: LineType;
  placement: AboveBelow | null;
};

/** Represents a doit mark. */
export type Doit = {
  type: 'doit';
  lineType: LineType;
  placement: AboveBelow | null;
};

/** Represents a falloff mark. */
export type Falloff = {
  type: 'falloff';
  lineType: LineType;
  placement: AboveBelow | null;
};

/** Represents a breath mark. */
export type BreathMark = {
  type: 'breathmark';
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

  /** Returns the detached legato articulations. */
  getDetachedLegatos(): DetachedLegato[] {
    return this.element.all('detached-legato').map((element) => ({
      type: 'detachedlegato',
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

  /** Returns the scoop articulations. */
  getScoops(): Scoop[] {
    return this.element.all('scoop').map((element) => ({
      type: 'scoop',
      lineType: element.attr('line-type').withDefault<LineType>('solid').enum(LINE_TYPES),
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }

  /** Returns the plop articulations. */
  getPlops(): Plop[] {
    return this.element.all('plop').map((element) => ({
      type: 'plop',
      lineType: element.attr('line-type').withDefault<LineType>('solid').enum(LINE_TYPES),
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }

  /** Returns the doit articulations. */
  getDoits(): Doit[] {
    return this.element.all('doit').map((element) => ({
      type: 'doit',
      lineType: element.attr('line-type').withDefault<LineType>('solid').enum(LINE_TYPES),
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }

  /** Returns the falloff articulations. */
  getFalloffs(): Falloff[] {
    return this.element.all('falloff').map((element) => ({
      type: 'falloff',
      lineType: element.attr('line-type').withDefault<LineType>('solid').enum(LINE_TYPES),
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }

  /** Returns the breath mark articulations. */
  getBreathMarks(): BreathMark[] {
    return this.element.all('breath-mark').map((element) => ({
      type: 'breathmark',
      placement: element.attr('placement').enum(ABOVE_BELOW),
    }));
  }
}

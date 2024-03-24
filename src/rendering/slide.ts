import * as vexflow from 'vexflow';
import { Address } from './address';
import { SpannerMap } from './spannermap';
import { SpannerData } from './types';

/** The result of rendering a slide. */
export type SlideRendering = {
  type: 'slide';
  vexflow: {
    tabSlide: vexflow.TabSlide;
  };
};

/** The types of slide fragments. */
export type SlideFragmentType = 'unspecified' | 'start' | 'stop';

/** Represents a piece of a slide. */
export type SlideFragment = {
  type: SlideFragmentType;
  number: number;
  address: Address;
  vexflow: {
    note: vexflow.Note;
    keyIndex: number;
  };
};

type SlideContainer = SpannerMap<number, Slide>;

/** Represents a rapid movement from one note to another such that the individual notes are not discernable. */
export class Slide {
  private fragments: [SlideFragment, ...SlideFragment[]];

  private constructor(opts: { fragment: SlideFragment }) {
    this.fragments = [opts.fragment];
  }

  /** Processes spanner data for slides. */
  static process(data: SpannerData, container: SlideContainer): void {
    if (data.vexflow.type !== 'tabnote') {
      return;
    }

    const note = data.musicXML.note;
    const isRest = note?.isRest() ?? false;
    const isGrace = note?.isGrace() ?? false;
    if (!note || isRest || isGrace) {
      return;
    }

    const slides = note
      .getNotations()
      .flatMap((notations) => notations)
      .flatMap((notation) => notation.getSlides());
    for (const slide of slides) {
      Slide.commit(
        {
          type: slide.getType() ?? 'unspecified',
          number: slide.getNumber(),
          address: data.address,
          vexflow: {
            note: data.vexflow.note,
            keyIndex: data.keyIndex,
          },
        },
        container
      );
    }
  }

  /** Commits a slide fragment to a container. */
  private static commit(fragment: SlideFragment, container: SlideContainer): void {
    const slide = container.get(fragment.number);
    const last = slide?.getLastFragment();
    const isAllowedType = Slide.getAllowedTypes(last?.type).includes(fragment.type);

    if (fragment.type === 'start') {
      container.push(fragment.number, new Slide({ fragment }));
    } else if (slide && isAllowedType) {
      slide.fragments.push(fragment);
    }
  }

  private static getAllowedTypes(type: SlideFragmentType | undefined): SlideFragmentType[] {
    switch (type) {
      case 'unspecified':
        return ['start'];
      case 'start':
        return ['start', 'stop'];
      case 'stop':
        return [];
      default:
        return [];
    }
  }

  /** Renders the slide. */
  render(): SlideRendering {
    return {
      type: 'slide',
      vexflow: {
        tabSlide: new vexflow.TabSlide({
          firstNote: this.getFirstFragment().vexflow.note,
          lastNote: this.getLastFragment().vexflow.note,
        }),
      },
    };
  }

  private getFirstFragment(): SlideFragment {
    return this.fragments[0];
  }

  private getLastFragment(): SlideFragment {
    return this.fragments[this.fragments.length - 1];
  }
}

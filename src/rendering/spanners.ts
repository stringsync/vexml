import { Beam, BeamRendering } from './beam';
import { Slur, SlurRendering } from './slur';
import { Tuplet, TupletRendering } from './tuplet';
import { BeamFragment, SpannerFragment, TupletFragment } from './types';

/** The result of rendering spanners. */
export type SpannersRendering = {
  type: 'spanners';
  beams: BeamRendering[];
  tuplets: TupletRendering[];
  slurs: SlurRendering[];
};

/**
 * Houses **all** spanner structures that contain multiple notes.
 *
 * NB: This class is intentionally plural, because it doesn't make complete sense to represent a single spanner. This is
 * meant to hold the logic of creating _multiple_ spanners from a list of `SpannerFragments`. We don't want the caller
 * to have to delineate where each spanner stops.
 */
export class Spanners {
  private spannerFragments: SpannerFragment[];

  constructor(opts: { spannerFragments: SpannerFragment[] }) {
    this.spannerFragments = opts.spannerFragments;
  }

  /** Renders the spanners. */
  render(): SpannersRendering {
    return {
      type: 'spanners',
      beams: this.getBeams().map((beam) => beam.render()),
      tuplets: this.getTuplets().map((tuplet) => tuplet.render()),
      slurs: this.getSlurs().map((slur) => slur.render()),
    };
  }

  private getBeams(): Beam[] {
    const beams = new Array<Beam>();

    const fragments = this.spannerFragments.filter(
      (spannerFragment): spannerFragment is BeamFragment => spannerFragment.type === 'beam'
    );
    let buffer = new Array<BeamFragment>();

    for (let index = 0; index < fragments.length; index++) {
      const fragment = fragments[index];
      const isLast = index === fragments.length - 1;

      // This is a "lenient" state machine where errors in the MusicXML document are silently defaulted to reasonable
      // behavior.
      switch (fragment.phase) {
        case 'start':
        case 'continue':
          buffer.push(fragment);
          break;
        case 'stop':
          buffer.push(fragment);
          beams.push(new Beam({ fragments: buffer }));
          buffer = [];
          break;
      }

      if (isLast && buffer.length > 0) {
        beams.push(new Beam({ fragments: buffer }));
      }
    }

    return beams;
  }

  private getTuplets(): Tuplet[] {
    const tuplets = new Array<Tuplet>();

    const fragments = this.spannerFragments.filter(
      (spannerFragment): spannerFragment is TupletFragment => spannerFragment.type === 'tuplet'
    );
    let buffer = new Array<TupletFragment>();

    for (let index = 0; index < fragments.length; index++) {
      const fragment = fragments[index];
      const isLast = index === fragments.length - 1;

      switch (fragment.phase) {
        case 'start':
          buffer.push(fragment);
          break;
        case 'unspecified':
          // Tuplets don't have an accounting mechanism of "continue" like beams. Therefore, we need to implicitly
          // continue if we've come across a "start" (denoted by the vfNotes length).
          if (buffer.length > 0) {
            buffer.push(fragment);
          }
          break;
        case 'stop':
          buffer.push(fragment);
          tuplets.push(new Tuplet({ fragments: buffer }));
          buffer = [];
          break;
      }

      if (isLast && buffer.length > 0) {
        tuplets.push(new Tuplet({ fragments: buffer }));
      }
    }

    return tuplets;
  }

  private getSlurs(): Slur[] {
    return [];
  }
}

import { Config } from '@/config';
import * as debug from '@/debug';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { SpannerData } from './types';
import { SpannerMap } from './spannermap';
import { Address } from './address';

/** The result of rendering a wavy line. */
export type VibratoRendering = {
  type: 'vibrato';
  vexflow: {
    vibratoBracket: vexflow.VibratoBracket;
  };
};

/** A piece of a wavy line. */
export type VibratoFragment = {
  type: VibratoFragmentType;
  address: Address<'voice'>;
  vexflow: {
    note: vexflow.Note;
  };
};

type VibratoFragmentType = 'start' | 'continue' | 'stop' | 'unspecified';

type VibratoContainer = SpannerMap<null, Vibrato>;

/**
 * Wavy lines are one way to indicate trills and vibrato.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wavy-line/
 */
export class Vibrato {
  private config: Config;
  private log: debug.Logger;
  private fragments: [VibratoFragment, ...VibratoFragment[]];

  private constructor(opts: { config: Config; log: debug.Logger; fragment: VibratoFragment }) {
    this.config = opts.config;
    this.log = opts.log;
    this.fragments = [opts.fragment];
  }

  static process(opts: { config: Config; log: debug.Logger; data: SpannerData; container: VibratoContainer }): void {
    const { config, log, data, container } = opts;
    data.musicXML.note
      ?.getNotations()
      .flatMap((notation) => notation.getOrnaments())
      .flatMap((ornament) => ornament.getWavyLines())
      .forEach((wavyLine) => {
        Vibrato.commit({
          config,
          log,
          fragment: {
            type: wavyLine.value.getType(),
            address: data.address,
            vexflow: { note: data.vexflow.note },
          },
          container,
        });
      });
  }

  private static commit(opts: {
    config: Config;
    log: debug.Logger;
    fragment: VibratoFragment;
    container: VibratoContainer;
  }): void {
    const { config, log, fragment, container } = opts;
    const vibrato = container.get(null);
    const last = vibrato?.getLastFragment();
    const isAllowedType = Vibrato.getAllowedTypes(last?.type).includes(fragment.type);
    const isOnSameSystem = last?.address.isMemberOf('system', fragment.address) ?? false;

    if (fragment.type === 'start') {
      container.push(null, new Vibrato({ config, log, fragment }));
    } else if (vibrato && isAllowedType && isOnSameSystem) {
      vibrato.fragments.push(fragment);
    } else if (vibrato && isAllowedType && !isOnSameSystem) {
      container.push(null, new Vibrato({ config, log, fragment: { ...fragment, type: 'start' } }));
    }
  }

  private static getAllowedTypes(type: VibratoFragmentType | undefined): VibratoFragmentType[] {
    switch (type) {
      case 'start':
      case 'continue':
      case 'unspecified':
        return ['continue', 'stop', 'unspecified'];
      case 'stop':
        return [];
      default:
        return [];
    }
  }

  render(): VibratoRendering {
    this.log.debug('rendering vibrato');

    const vfStartNote = util.first(this.fragments)!.vexflow.note;
    const vfEndNote = util.last(this.fragments)!.vexflow.note;

    const vfVibratoBracket = new vexflow.VibratoBracket({
      start: vfStartNote,
      stop: vfEndNote,
    });

    return {
      type: 'vibrato',
      vexflow: {
        vibratoBracket: vfVibratoBracket,
      },
    };
  }

  private getLastFragment(): VibratoFragment {
    return util.last(this.fragments)!;
  }
}

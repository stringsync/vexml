import { Config } from '@/config';
import * as debug from '@/debug';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as conversions from './conversions';
import * as musicxml from '@/musicxml';
import { SpannerData } from './types';
import { SpannerMap } from './spannermap';
import { Address } from './address';

/** The result of rendering a wedge. */
export type WedgeRendering = {
  type: 'wedge';
  vexflow: {
    staveHairpin: vexflow.StaveHairpin;
  };
};

/** A piece of a wedge. */
export type WedgeFragment = StartWedgeFragment | ContinueWedgeFragment | StopWedgeFragment | UnspecifiedWedgeFragment;

/** A container for wedges. */
export type WedgeContainer = SpannerMap<null, Wedge>;

type WedgeFragmentType = WedgeFragment['type'];

type StartWedgeFragment = {
  type: 'start';
  address: Address<'voice'>;
  vexflow: {
    note: vexflow.Note;
    position: vexflow.ModifierPosition;
    staveHairpinType: number;
  };
};

type ContinueWedgeFragment = {
  type: 'continue';
  address: Address<'voice'>;
  vexflow: {
    note: vexflow.Note;
  };
};

type StopWedgeFragment = {
  type: 'stop';
  address: Address<'voice'>;
  vexflow: {
    note: vexflow.Note;
  };
};

type UnspecifiedWedgeFragment = {
  type: 'unspecified';
  address: Address<'voice'>;
  vexflow: {
    note: vexflow.Note;
  };
};

/** Represents a crescendo or decrescendo. */
export class Wedge {
  private config: Config;
  private log: debug.Logger;
  private fragments: [StartWedgeFragment, ...WedgeFragment[]];

  private constructor(opts: { config: Config; log: debug.Logger; fragment: StartWedgeFragment }) {
    this.config = opts.config;
    this.log = opts.log;
    this.fragments = [opts.fragment];
  }

  static process(opts: { config: Config; log: debug.Logger; data: SpannerData; container: WedgeContainer }): void {
    const { config, log, data, container } = opts;
    // For applications where a specific direction is indeed attached to a specific note, the <direction> element can be
    // associated with the first <note> element that follows it in score order that is not in a different voice.
    // See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction/

    if (data.musicXML.directions.length === 0) {
      Wedge.commit({
        config,
        log,
        fragment: {
          type: 'unspecified',
          address: data.address,
          vexflow: { note: data.vexflow.note },
        },
        container,
      });
    }

    for (const direction of data.musicXML.directions) {
      const directionPlacement = direction.getPlacement() ?? 'below';
      const modifierPosition = conversions.fromAboveBelowToModifierPosition(directionPlacement);

      for (const directionType of direction.getTypes()) {
        const content = directionType.getContent();

        let wedgeType: musicxml.WedgeType | null = null;
        if (content.type === 'wedge') {
          wedgeType = content.wedge.getType();
        }

        switch (wedgeType) {
          case 'crescendo':
          case 'diminuendo':
            Wedge.commit({
              config,
              log,
              fragment: {
                type: 'start',
                address: data.address,
                vexflow: {
                  note: data.vexflow.note,
                  staveHairpinType: conversions.fromWedgeTypeToStaveHairpinType(wedgeType),
                  position: modifierPosition,
                },
              },
              container,
            });
            break;
          case 'continue':
            Wedge.commit({
              config,
              log,
              fragment: {
                type: 'continue',
                address: data.address,
                vexflow: { note: data.vexflow.note },
              },
              container,
            });
            break;
          case 'stop':
            Wedge.commit({
              config,
              log,
              fragment: {
                type: 'stop',
                address: data.address,
                vexflow: { note: data.vexflow.note },
              },
              container,
            });
            break;
          default:
            Wedge.commit({
              config,
              log,
              fragment: {
                type: 'unspecified',
                address: data.address,
                vexflow: { note: data.vexflow.note },
              },
              container,
            });
        }
      }
    }
  }

  /** Conditionally commits the fragment when it can be accepted. */
  private static commit(opts: {
    config: Config;
    log: debug.Logger;
    fragment: WedgeFragment;
    container: WedgeContainer;
  }): void {
    const { config, log, fragment, container } = opts;
    const wedge = container.get(null);
    const last = wedge?.getLastFragment();
    const isAllowedType = Wedge.getAllowedTypes(last?.type).includes(fragment.type);
    const isOnSameSystem = last?.address.isMemberOf('system', fragment.address) ?? false;

    if (fragment.type === 'start') {
      container.push(null, new Wedge({ config, log, fragment }));
    } else if (wedge && isAllowedType && isOnSameSystem) {
      wedge.fragments.push(fragment);
    } else if (wedge && isAllowedType && !isOnSameSystem) {
      container.push(null, wedge.copy(fragment));
    }
  }

  /** Whether the fragment is allowed to be added to the wedge. */
  private static getAllowedTypes(type: WedgeFragmentType | undefined): WedgeFragmentType[] {
    switch (type) {
      case 'start':
      case 'continue':
      case 'unspecified':
        return ['continue', 'unspecified', 'stop'];
      case 'stop':
        return [];
      default:
        return [];
    }
  }

  render(): WedgeRendering {
    this.log.debug('rendering wedge');

    const firstNote = this.getFirstFragment().vexflow.note;
    const lastNote = this.getLastFragment().vexflow.note;

    const startWedgeFragment = this.getFirstFragment();

    const vfStaveHairpin = new vexflow.StaveHairpin(
      {
        firstNote,
        lastNote,
      },
      startWedgeFragment.vexflow.staveHairpinType
    ).setPosition(startWedgeFragment.vexflow.position);

    return {
      type: 'wedge',
      vexflow: { staveHairpin: vfStaveHairpin },
    };
  }

  private getFirstFragment(): StartWedgeFragment {
    return this.fragments[0];
  }

  private getLastFragment(): WedgeFragment {
    return util.last(this.fragments)!;
  }

  private copy(fragment: WedgeFragment): Wedge {
    const first = this.getFirstFragment();
    return new Wedge({
      config: this.config,
      log: this.log,
      fragment: {
        type: 'start',
        address: fragment.address,
        vexflow: {
          note: fragment.vexflow.note,
          position: first.vexflow.position,
          staveHairpinType: first.vexflow.staveHairpinType,
        },
      },
    });
  }
}

import { Config } from '@/config';
import * as debug from '@/debug';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import { Address } from './address';
import { SpannerMap } from './spannermap';
import { SpannerData } from './types';

/** The result of rendering an octive shift. */
export type OctaveShiftRendering = {
  type: 'octaveshift';
  vexflow: {
    textBracket: vexflow.TextBracket;
  };
};

type OctaveShiftContainer = SpannerMap<null, OctaveShift>;

/** A piece of an octave shift. */
export type OctaveShiftFragment =
  | StartOctaveShiftFragment
  | ContinueOctaveShiftFragment
  | StopOctaveShiftFragment
  | UnspecifiedOctaveShiftFragment;

type OctaveShiftType = OctaveShiftFragment['type'];

type StartOctaveShiftFragment = {
  type: 'start';
  address: Address<'voice'>;
  text: string;
  superscript: string;
  vexflow: {
    note: vexflow.Note;
    textBracketPosition: vexflow.TextBracketPosition;
  };
};

type ContinueOctaveShiftFragment = {
  type: 'continue';
  address: Address<'voice'>;
  vexflow: {
    note: vexflow.Note;
  };
};

type StopOctaveShiftFragment = {
  type: 'stop';
  address: Address<'voice'>;
  vexflow: {
    note: vexflow.Note;
  };
};

type UnspecifiedOctaveShiftFragment = {
  type: 'unspecified';
  address: Address<'voice'>;
  vexflow: {
    note: vexflow.Note;
  };
};

/**
 * Represents an octave shift.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-shift/
 */
export class OctaveShift {
  private config: Config;
  private log: debug.Logger;
  private fragments: [StartOctaveShiftFragment, ...OctaveShiftFragment[]];

  private constructor(opts: { config: Config; log: debug.Logger; fragment: StartOctaveShiftFragment }) {
    this.config = opts.config;
    this.log = opts.log;
    this.fragments = [opts.fragment];
  }

  static process(opts: {
    config: Config;
    log: debug.Logger;
    data: SpannerData;
    container: OctaveShiftContainer;
  }): void {
    const { config, log, data, container } = opts;
    data.musicXML.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.OctaveShiftDirectionTypeContent => content.type === 'octaveshift')
      .map((content) => content.octaveShift)
      .forEach((octaveShift) => {
        switch (octaveShift.getType()) {
          case 'up':
            OctaveShift.commit({
              config,
              log,
              fragment: {
                type: 'start',
                address: data.address,
                text: octaveShift.getSize().toString(),
                superscript: 'mb',
                vexflow: {
                  note: data.vexflow.note,
                  textBracketPosition: vexflow.TextBracketPosition.BOTTOM,
                },
              },
              container,
            });
            break;
          case 'down':
            OctaveShift.commit({
              config,
              log,
              fragment: {
                type: 'start',
                address: data.address,
                text: octaveShift.getSize().toString(),
                superscript: 'va',
                vexflow: {
                  note: data.vexflow.note,
                  textBracketPosition: vexflow.TextBracketPosition.TOP,
                },
              },
              container,
            });
            break;
          case 'continue':
            OctaveShift.commit({
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
            OctaveShift.commit({
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
        }
      });
  }

  private static commit(opts: {
    config: Config;
    log: debug.Logger;
    fragment: OctaveShiftFragment;
    container: OctaveShiftContainer;
  }): void {
    const { config, log, container, fragment } = opts;
    const octaveShift = container.get(null);
    const last = octaveShift?.getLastFragment();
    const isAllowedType = OctaveShift.getAllowedTypes(last?.type).includes(fragment.type);
    const isOnSameSystem = last?.address.isMemberOf('system', fragment.address) ?? false;

    if (fragment.type === 'start') {
      container.push(null, new OctaveShift({ config, log, fragment }));
    } else if (octaveShift && isAllowedType && isOnSameSystem) {
      octaveShift.fragments.push(fragment);
    } else if (octaveShift && isAllowedType && !isOnSameSystem) {
      container.push(null, octaveShift.copy(fragment));
    }
  }

  private static getAllowedTypes(type: OctaveShiftType | undefined): OctaveShiftType[] {
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

  /** Renders the octave shift. */
  render(): OctaveShiftRendering {
    const startNote = util.first(this.fragments)!.vexflow.note;
    const stopNote = util.last(this.fragments)!.vexflow.note;

    const startOctaveShiftFragment = this.getFirstFragment();

    const vfTextBracket = new vexflow.TextBracket({
      start: startNote,
      stop: stopNote,
      position: startOctaveShiftFragment.vexflow.textBracketPosition,
      text: startOctaveShiftFragment.text,
      superscript: startOctaveShiftFragment.superscript,
    });

    return {
      type: 'octaveshift',
      vexflow: {
        textBracket: vfTextBracket,
      },
    };
  }

  private getFirstFragment(): StartOctaveShiftFragment {
    return this.fragments[0];
  }

  private getLastFragment(): OctaveShiftFragment {
    return util.last(this.fragments)!;
  }

  private copy(fragment: OctaveShiftFragment): OctaveShift {
    const first = this.getFirstFragment();
    return new OctaveShift({
      config: this.config,
      log: this.log,
      fragment: {
        type: 'start',
        address: fragment.address,
        superscript: first.superscript,
        text: first.text,
        vexflow: {
          note: fragment.vexflow.note,
          textBracketPosition: first.vexflow.textBracketPosition,
        },
      },
    });
  }
}

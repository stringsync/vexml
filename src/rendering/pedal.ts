import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { SpannerData } from './types';
import { SpannerMap } from './spannermap';
import { Address } from './address';

/** The result of rendering a pedal. */
export type PedalRendering = {
  type: 'pedal';
  vexflow: {
    pedalMarking: vexflow.PedalMarking;
  };
};

type PedalContainer = SpannerMap<null, Pedal>;

/** A piece of a pedal. */
export type PedalFragment = {
  type: PedalFragmentType;
  address: Address<'voice'>;
  musicXML: {
    pedal: musicxml.Pedal;
  };
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
};

type PedalFragmentType = musicxml.PedalType | 'unspecified';

/** Represents piano pedal marks. */
export class Pedal {
  private fragments: [PedalFragment, ...PedalFragment[]];

  private constructor(opts: { fragment: PedalFragment }) {
    this.fragments = [opts.fragment];
  }

  static process(data: SpannerData, container: PedalContainer): void {
    data.musicXML.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.PedalDirectionTypeContent => content.type === 'pedal')
      .map((content) => content.pedal)
      .forEach((pedal) => {
        const pedalType = pedal.getType();
        Pedal.commit(
          {
            type: pedalType,
            address: data.address,
            musicXML: { pedal },
            vexflow: { staveNote: data.vexflow.staveNote },
          },
          container
        );
      });
  }

  private static commit(fragment: PedalFragment, container: PedalContainer): void {
    const pedal = container.get(null);
    const last = pedal?.getLastFragment();
    const isAllowedType = Pedal.getAllowedTypes(last?.type).includes(fragment.type);
    const isOnSameSystem = last?.address.isMemberOf('system', fragment.address) ?? false;

    if (fragment.type === 'start' || fragment.type === 'resume') {
      container.push(null, new Pedal({ fragment }));
    } else if (pedal && isAllowedType && isOnSameSystem) {
      pedal.fragments.push(fragment);
    } else if (pedal && isAllowedType && !isOnSameSystem) {
      container.push(null, new Pedal({ fragment }));
    }
  }

  private static getAllowedTypes(type: PedalFragmentType | undefined): PedalFragmentType[] {
    switch (type) {
      case 'start':
      case 'sostenuto':
      case 'resume':
      case 'continue':
      case 'change':
        return ['continue', 'change', 'stop', 'discontinue'];
      case 'stop':
      case 'discontinue':
        return [];
      default:
        return [];
    }
  }

  /** Renders the pedal. */
  render(): PedalRendering {
    const vfStaveNotes = this.getVfStaveNotes();
    const vfPedalMarkingType = this.getVfPedalMarkingType();
    const vfPedalMarking = new vexflow.PedalMarking(vfStaveNotes).setType(vfPedalMarkingType);

    return {
      type: 'pedal',
      vexflow: {
        pedalMarking: vfPedalMarking,
      },
    };
  }

  private getLastFragment(): PedalFragment {
    return util.last(this.fragments)!;
  }

  private getVfStaveNotes(): vexflow.StaveNote[] {
    const result = new Array<vexflow.StaveNote>();

    for (const fragment of this.fragments) {
      switch (fragment.musicXML.pedal.getType()) {
        case 'change':
          // This is required for vexflow to show pedal changes.
          result.push(fragment.vexflow.staveNote, fragment.vexflow.staveNote);
          break;
        default:
          result.push(fragment.vexflow.staveNote);
          break;
      }
    }

    return result;
  }

  private getVfPedalMarkingType(): number {
    const fragment = util.first(this.fragments)!;

    const sign = fragment.musicXML.pedal.sign();
    const line = fragment.musicXML.pedal.line();

    if (line && sign) {
      return vexflow.PedalMarking.type.MIXED;
    } else if (line) {
      return vexflow.PedalMarking.type.BRACKET;
    } else if (sign) {
      return vexflow.PedalMarking.type.TEXT;
    } else {
      return vexflow.PedalMarking.type.BRACKET;
    }
  }
}

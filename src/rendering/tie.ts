import { Config } from '@/config';
import * as debug from '@/debug';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Address } from './address';
import { SpannerMap } from './spannermap';
import { SpannerData } from './types';

/** The result of rendering a tie. */
export type TieRendering = {
  type: 'tie';
  vexflow: {
    tie: vexflow.StaveTie | vexflow.TabTie;
  };
};

/** The types of tie fragments. */
export type TieFragmentType = 'start' | 'stop' | 'continue' | 'let-ring';

/** Represents a piece of a tie. */
export type TieFragment = {
  type: TieFragmentType;
  number: number;
  address: Address;
  vexflow:
    | {
        type: 'note';
        note: vexflow.Note;
        keyIndex: number;
      }
    // Indicates that the note is on another system.
    | {
        type: 'none';
        keyIndex: number;
      };
};

/** The container for ties. */
type TieContainer = SpannerMap<number, Tie>;

/** Represents a curved line that connects two notes of the same pitch. */
export class Tie {
  private config: Config;
  private log: debug.Logger;
  private fragments: [TieFragment, ...TieFragment[]];

  private constructor(opts: { config: Config; log: debug.Logger; fragment: TieFragment }) {
    this.config = opts.config;
    this.log = opts.log;
    this.fragments = [opts.fragment];
  }

  /** Processes spanner data for ties. */
  static process(opts: { config: Config; log: debug.Logger; data: SpannerData; container: TieContainer }): void {
    const { config, log, data, container } = opts;
    const note = data.musicXML.note;
    const isRest = note?.isRest() ?? false;
    const isGrace = note?.isGrace() ?? false;
    if (!note || isRest || isGrace) {
      return;
    }

    const ties = note.getNotations().flatMap((notations) => notations.getTieds());
    for (const tie of ties) {
      const tieType = tie.getType();
      if (!tieType) {
        continue;
      }

      Tie.commit({
        config,
        log,
        fragment: {
          type: tieType,
          number: tie.getNumber(),
          address: data.address,
          vexflow: {
            type: 'note',
            note: data.vexflow.note,
            keyIndex: data.keyIndex,
          },
        },
        container,
      });
    }
  }

  private static commit(opts: {
    config: Config;
    log: debug.Logger;
    fragment: TieFragment;
    container: TieContainer;
  }): void {
    const { config, log, fragment, container } = opts;
    let tie = container.get(fragment.number);
    const last = tie?.getLastFragment();
    const isAllowedType = Tie.getAllowedTypes(last?.type).includes(fragment.type);

    if (fragment.type === 'start') {
      container.push(fragment.number, new Tie({ config, log, fragment }));
    } else if (tie && isAllowedType) {
      if (last && last.address.getSystemIndex() === fragment.address.getSystemIndex()) {
        tie.fragments.push(fragment);
      } else if (last) {
        // End the tie with a null end note on the previous system.
        tie.fragments.push({
          type: 'stop',
          address: last.address,
          number: last.number,
          vexflow: { type: 'none', keyIndex: last.vexflow.keyIndex },
        });

        // Start a tie with a null start note on the next system.
        tie = new Tie({
          config,
          log,
          fragment: {
            type: 'start',
            address: fragment.address,
            number: fragment.number,
            vexflow: { type: 'none', keyIndex: fragment.vexflow.keyIndex },
          },
        });
        container.push(fragment.number, tie);
        tie.fragments.push(fragment);
      } else {
        throw new Error('Unexpected tie fragment');
      }
    }
  }

  private static getAllowedTypes(type: TieFragmentType | undefined): TieFragmentType[] {
    switch (type) {
      case 'start':
      case 'continue':
        return ['continue', 'stop', 'let-ring'];
      case 'let-ring':
        return ['stop'];
      case 'stop':
        return [];
      default:
        return [];
    }
  }

  /** Renders the tie. */
  render(): TieRendering {
    const firstFragment = this.getFirstFragment();
    const lastFragment = this.getLastFragment();

    const vfNotes = new Array<vexflow.Note>();

    const vfTieNotes: vexflow.TieNotes = {};

    switch (firstFragment.vexflow.type) {
      case 'note':
        vfNotes.push(firstFragment.vexflow.note);
        vfTieNotes.firstNote = firstFragment.vexflow.note;
        vfTieNotes.firstIndexes = [firstFragment.vexflow.keyIndex];
        break;
      case 'none':
        vfTieNotes.firstNote = null;
        vfTieNotes.firstIndexes = [firstFragment.vexflow.keyIndex];
        break;
    }

    switch (lastFragment.vexflow.type) {
      case 'note':
        vfNotes.push(lastFragment.vexflow.note);
        vfTieNotes.lastNote = lastFragment.vexflow.note;
        vfTieNotes.lastIndexes = [lastFragment.vexflow.keyIndex];
        break;
      case 'none':
        vfTieNotes.lastNote = null;
        vfTieNotes.lastIndexes = [lastFragment.vexflow.keyIndex];
        break;
    }

    if (vfNotes.length === 0) {
      throw new Error('Unexpected tie with no notes');
    }
    const vfNote = vfNotes[0];

    const vfSlurDirection = this.getVfSlurDirection(vfNote);

    const vfTie =
      vfNote instanceof vexflow.TabNote
        ? new vexflow.TabTie(vfTieNotes).setDirection(vfSlurDirection)
        : new vexflow.StaveTie(vfTieNotes).setDirection(vfSlurDirection);

    return {
      type: 'tie',
      vexflow: {
        tie: vfTie,
      },
    };
  }

  private getFirstFragment(): TieFragment {
    return util.first(this.fragments)!;
  }

  private getLastFragment(): TieFragment {
    return util.last(this.fragments)!;
  }

  private getVfSlurDirection(vfNote: vexflow.Note): number {
    if (vfNote instanceof vexflow.TabNote) {
      return -1;
    }

    const vfStemDirection = vfNote.getStemDirection();
    switch (vfStemDirection) {
      case vexflow.Stem.UP:
        return 1;
      case vexflow.Stem.DOWN:
        return -1;
      default:
        return 1;
    }
  }
}

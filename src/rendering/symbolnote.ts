import { Config } from '@/config';
import * as debug from '@/debug';
import * as vexflow from 'vexflow';
import { DynamicsCharacter, NoteDurationDenominator } from './enums';

/** The result of rendering a symbol note. */
export type SymbolNoteRendering = TextDynamicsRendering;

/** The result of rendering a symbol note that has text dynamics. */
export type TextDynamicsRendering = {
  type: 'symbolnote';
  vexflow: {
    type: 'textdynamics';
    textDynamics: vexflow.TextDynamics;
  };
};

/** The different types of data that can be used to render a symbol note. */
type SymbolNoteData = DynamicsNoteData;

type DynamicsNoteData = {
  type: 'dynamics';
  durationDenominator: NoteDurationDenominator;
  characters: DynamicsCharacter[];
};

/** A symbol that is associated with the stave like a note. */
export class SymbolNote {
  private config: Config;
  private log: debug.Logger;
  private data: SymbolNoteData;

  private constructor(opts: { config: Config; log: debug.Logger; data: SymbolNoteData }) {
    this.config = opts.config;
    this.log = opts.log;
    this.data = opts.data;
  }

  /** Creates a dynamics symbol note. */
  static dynamics(opts: {
    config: Config;
    log: debug.Logger;
    characters: DynamicsCharacter[];
    durationDenominator: NoteDurationDenominator;
  }): SymbolNote {
    return new SymbolNote({
      config: opts.config,
      log: opts.log,
      data: {
        type: 'dynamics',
        characters: opts.characters,
        durationDenominator: opts.durationDenominator,
      },
    });
  }

  /** Renders the symbol note. */
  render(): SymbolNoteRendering {
    this.log.debug('rendering symbol note', { type: this.data.type });

    switch (this.data.type) {
      case 'dynamics':
        return this.renderDynamics(this.data);
    }
  }

  private renderDynamics(data: DynamicsNoteData): SymbolNoteRendering {
    return {
      type: 'symbolnote',
      vexflow: {
        type: 'textdynamics',
        textDynamics: new vexflow.TextDynamics({
          text: data.characters.join(''),
          duration: data.durationDenominator,
        }),
      },
    };
  }
}

import * as vexflow from 'vexflow';
import { DynamicsCharacter, NoteDurationDenominator } from './enums';

/** The result of rendering a symbolic note. */
export type SymbolicNoteRendering = {
  type: 'symbolicnote';
  vexflow: {
    type: 'textdynamics';
    textDynamics: vexflow.TextDynamics;
  };
};

type DynamicsNoteData = {
  type: 'dynamics';
  durationDenominator: NoteDurationDenominator;
  characters: DynamicsCharacter[];
};

/** The different types of data that can be used to render a symbolic note. */
type SymbolicNoteData = DynamicsNoteData;

/** A symbol that is associated with the stave like a note. */
export class SymbolicNote {
  data: SymbolicNoteData;

  private constructor(data: SymbolicNoteData) {
    this.data = data;
  }

  /** Creates a dynamics symbolic note. */
  static dynamics(opts: {
    characters: DynamicsCharacter[];
    durationDenominator: NoteDurationDenominator;
  }): SymbolicNote {
    return new SymbolicNote({
      type: 'dynamics',
      characters: opts.characters,
      durationDenominator: opts.durationDenominator,
    });
  }

  /** Renders the symbolic note. */
  render(): SymbolicNoteRendering {
    switch (this.data.type) {
      case 'dynamics':
        return this.renderDynamics(this.data);
    }
  }

  private renderDynamics(data: DynamicsNoteData): SymbolicNoteRendering {
    return {
      type: 'symbolicnote',
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

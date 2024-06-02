import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import { Config } from './config';
import { NoteDurationDenominator } from './enums';
import { Clef } from './clef';
import { Token } from './token';
import { Spanners } from './spanners';
import { Address } from './address';

/** The result of rendering a Rest. */
export type RestRendering = {
  type: 'rest';
  vexflow: {
    note: vexflow.Note;
  };
};

/**
 * Represents a musical rest, denoting a pause or silence in the music.
 *
 * The `Rest` class encapsulates the absence of sound within a specific duration in music notation. Just as notes define
 * when and how sound is produced, rests define when it's deliberately not. Each rest, much like its note counterpart,
 * has a rhythmic value determining its length.
 *
 * In musical compositions, rests play an essential role in shaping the music's rhythm, phrasing, and overall dynamics,
 * allowing for moments of reflection or anticipation.
 */
export class Rest {
  private config: Config;
  private musicXML: {
    note: musicxml.Note | null;
    directions: musicxml.Direction[];
  };
  private durationDenominator: NoteDurationDenominator;
  private clef: Clef;

  constructor(opts: {
    config: Config;
    musicXML: {
      note: musicxml.Note | null;
      directions: musicxml.Direction[];
    };
    durationDenominator: NoteDurationDenominator;
    clef: Clef;
  }) {
    this.config = opts.config;
    this.musicXML = opts.musicXML;
    this.durationDenominator = opts.durationDenominator;
    this.clef = opts.clef;
  }

  /** Creates a whole rest. */
  static whole(opts: { config: Config; clef: Clef }): Rest {
    return new Rest({
      config: opts.config,
      musicXML: {
        note: null,
        directions: [],
      },
      durationDenominator: '1',
      clef: opts.clef,
    });
  }

  /** Renders the Rest. */
  render(opts: { voiceEntryCount: number; spanners: Spanners; address: Address<'voice'> }): RestRendering {
    const dotCount = this.musicXML.note?.getDotCount() ?? 0;

    const vfStaveNote = new vexflow.StaveNote({
      keys: [this.getKey()],
      duration: `${this.durationDenominator}r`,
      dots: dotCount,
      alignCenter: this.shouldCenter(opts.voiceEntryCount),
      clef: this.clef.getType(),
    });

    for (let index = 0; index < dotCount; index++) {
      vexflow.Dot.buildAndAttach([vfStaveNote]);
    }

    this.getTokens()
      .map((token) => token.render())
      .forEach((tokenRendering) => {
        vfStaveNote.addModifier(tokenRendering.vexflow.annotation);
      });

    opts.spanners.process({
      keyIndex: 0,
      address: opts.address,
      musicXML: {
        directions: this.musicXML.directions,
        note: this.musicXML.note,
        octaveShift: null,
      },
      vexflow: {
        type: 'stavenote',
        note: vfStaveNote,
      },
    });

    return {
      type: 'rest',
      vexflow: { note: vfStaveNote },
    };
  }

  private getKey(): string {
    const displayPitch = this.musicXML.note?.getRestDisplayPitch();
    if (displayPitch) {
      return displayPitch;
    }
    if (this.clef.getType() === 'bass') {
      return 'D/3';
    }
    if (this.durationDenominator === '2') {
      return 'B/4';
    }
    if (this.durationDenominator === '1') {
      return 'D/5';
    }
    return 'B/4';
  }

  private getTokens(): Token[] {
    return this.musicXML.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.TokensDirectionTypeContent => content.type === 'tokens')
      .flatMap((content) => content.tokens.map((token) => new Token({ musicXML: { token } })));
  }

  private shouldCenter(voiceEntryCount: number): boolean {
    if (voiceEntryCount > 1) {
      return false;
    }
    if (this.durationDenominator === '1') {
      return true;
    }
    if (this.durationDenominator === '2') {
      return true;
    }
    return false;
  }
}

import { Config } from '@/config';
import * as debug from '@/debug';
import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import { NoteDurationDenominator } from './enums';
import { Clef } from './clef';
import { Token } from './token';
import { Spanners } from './spanners';
import { Address } from './address';

/** The result of rendering a Rest. */
export type RestRendering = {
  type: 'rest';
  address: Address<'voice'>;
  duration: NoteDurationDenominator;
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
  private log: debug.Logger;
  private musicXML: {
    note: musicxml.Note | null;
    directions: musicxml.Direction[];
  };
  private durationDenominator: NoteDurationDenominator;
  private clef: Clef;

  constructor(opts: {
    config: Config;
    log: debug.Logger;
    musicXML: {
      note: musicxml.Note | null;
      directions: musicxml.Direction[];
    };
    durationDenominator: NoteDurationDenominator;
    clef: Clef;
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.musicXML = opts.musicXML;
    this.durationDenominator = opts.durationDenominator;
    this.clef = opts.clef;
  }

  /** Creates a whole rest. */
  static whole(opts: { config: Config; log: debug.Logger; clef: Clef }): Rest {
    return new Rest({
      config: opts.config,
      log: opts.log,
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
    this.log.debug('rendering rest');

    const dotCount = this.musicXML.note?.getDotCount() ?? 0;

    const vfNote =
      this.clef.getType() === 'tab'
        ? new vexflow.TabNote({
            keys: [this.getKey()],
            duration: `${this.durationDenominator}r`,
            dots: dotCount,
            alignCenter: this.shouldCenter(opts.voiceEntryCount),
            clef: this.clef.getType(),
            positions: [{ str: 0, fret: '' }],
          })
        : new vexflow.StaveNote({
            keys: [this.getKey()],
            duration: `${this.durationDenominator}r`,
            dots: dotCount,
            alignCenter: this.shouldCenter(opts.voiceEntryCount),
            clef: this.clef.getType(),
          });

    for (let index = 0; index < dotCount; index++) {
      vexflow.Dot.buildAndAttach([vfNote]);
    }

    this.getTokens()
      .map((token) => token.render())
      .forEach((tokenRendering) => {
        vfNote.addModifier(tokenRendering.vexflow.annotation);
      });

    opts.spanners.process({
      keyIndex: 0,
      address: opts.address,
      musicXML: {
        directions: this.musicXML.directions,
        note: this.musicXML.note,
        octaveShift: null,
      },
      vexflow:
        vfNote instanceof vexflow.TabNote ? { type: 'tabnote', note: vfNote } : { type: 'stavenote', note: vfNote },
    });

    return {
      type: 'rest',
      address: opts.address,
      duration: this.durationDenominator,
      vexflow: { note: vfNote },
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
      .flatMap((content) =>
        content.tokens.map((token) => new Token({ config: this.config, log: this.log, musicXML: { token } }))
      );
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

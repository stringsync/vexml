import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as conversions from './conversions';
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
    staveNote: vexflow.StaveNote;
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
  private musicXml: {
    note: musicxml.Note | null;
    directions: musicxml.Direction[];
  };
  private displayPitch: string | null;
  private durationDenominator: NoteDurationDenominator;
  private dotCount: number;
  private clef: Clef;

  constructor(opts: {
    config: Config;
    musicXml: {
      note: musicxml.Note | null;
      directions: musicxml.Direction[];
    };
    displayPitch: string | null;
    durationDenominator: NoteDurationDenominator;
    dotCount: number;
    clef: Clef;
  }) {
    this.config = opts.config;
    this.musicXml = opts.musicXml;
    this.displayPitch = opts.displayPitch;
    this.durationDenominator = opts.durationDenominator;
    this.dotCount = opts.dotCount;
    this.clef = opts.clef;
  }

  /** Creates a whole rest. */
  static whole(opts: { config: Config; clef: Clef }): Rest {
    return new Rest({
      config: opts.config,
      musicXml: {
        note: null,
        directions: [],
      },
      displayPitch: null,
      durationDenominator: '1',
      dotCount: 0,
      clef: opts.clef,
    });
  }

  /** Renders the Rest. */
  render(opts: { voiceEntryCount: number; spanners: Spanners; address: Address<'voice'> }): RestRendering {
    const vfStaveNote = new vexflow.StaveNote({
      keys: [this.getKey()],
      duration: `${this.durationDenominator}r`,
      dots: this.dotCount,
      alignCenter: this.shouldCenter(opts.voiceEntryCount),
      clef: this.clef.getType(),
    });

    for (let index = 0; index < this.dotCount; index++) {
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
      musicXml: {
        directions: this.musicXml.directions,
        note: this.musicXml.note,
        octaveShift: null,
      },
      vexflow: {
        staveNote: vfStaveNote,
      },
    });

    this.addSpannerFragments({
      spanners: opts.spanners,
      vexflow: { staveNote: vfStaveNote },
    });

    return {
      type: 'rest',
      vexflow: { staveNote: vfStaveNote },
    };
  }

  private getKey(): string {
    if (this.displayPitch) {
      return this.displayPitch;
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
    return this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.TokensDirectionTypeContent => content.type === 'tokens')
      .flatMap((content) => content.tokens.map((token) => new Token({ musicXml: { token } })));
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

  private getTuplets(): musicxml.Tuplet[] {
    return (
      this.musicXml.note
        ?.getNotations()
        .find((notations) => notations.hasTuplets())
        ?.getTuplets() ?? []
    );
  }

  private addSpannerFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    this.addTupletFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
    this.addPedalFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
    this.addVibratoFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
    this.addOctaveShiftFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
  }

  private addTupletFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    const tuplet = util.first(this.getTuplets());
    switch (tuplet?.getType()) {
      case 'start':
        opts.spanners.addTupletFragment({
          type: 'start',
          vexflow: {
            location: conversions.fromAboveBelowToTupletLocation(tuplet.getPlacement()!),
            note: opts.vexflow.staveNote,
          },
        });
        break;
      case 'stop':
        opts.spanners.addTupletFragment({
          type: 'stop',
          vexflow: {
            note: opts.vexflow.staveNote,
          },
        });
        break;
      default:
        opts.spanners.addTupletFragment({
          type: 'unspecified',
          vexflow: {
            note: opts.vexflow.staveNote,
          },
        });
    }
  }

  private addPedalFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.PedalDirectionTypeContent => content.type === 'pedal')
      .map((content) => content.pedal)
      .forEach((pedal) => {
        const pedalType = pedal.getType();
        switch (pedalType) {
          case 'start':
          case 'sostenuto':
          case 'resume':
            opts.spanners.addPedalFragment({
              type: pedalType,
              musicXml: { pedal },
              vexflow: { staveNote: opts.vexflow.staveNote },
            });
            break;
          case 'continue':
          case 'change':
            opts.spanners.addPedalFragment({
              type: pedalType,
              musicXml: { pedal },
              vexflow: { staveNote: opts.vexflow.staveNote },
            });
            break;
          case 'stop':
          case 'discontinue':
            opts.spanners.addPedalFragment({
              type: pedalType,
              musicXml: { pedal },
              vexflow: { staveNote: opts.vexflow.staveNote },
            });
            break;
        }
      });
  }

  private addVibratoFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    this.musicXml.note
      ?.getNotations()
      .flatMap((notation) => notation.getOrnaments())
      .flatMap((ornament) => ornament.getWavyLines())
      .forEach((wavyLine) => {
        opts.spanners.addVibratoFragment({
          type: wavyLine.getType(),
          keyIndex: 0,
          vexflow: { note: opts.vexflow.staveNote },
        });
      });
  }

  private addOctaveShiftFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.OctaveShiftDirectionTypeContent => content.type === 'octaveshift')
      .map((content) => content.octaveShift)
      .forEach((octaveShift) => {
        switch (octaveShift.getType()) {
          case 'up':
            opts.spanners.addOctaveShiftFragment({
              type: 'start',
              text: octaveShift.getSize().toString(),
              superscript: 'mb',
              vexflow: {
                note: opts.vexflow.staveNote,
                textBracketPosition: vexflow.TextBracketPosition.BOTTOM,
              },
            });
            break;
          case 'down':
            opts.spanners.addOctaveShiftFragment({
              type: 'start',
              text: octaveShift.getSize().toString(),
              superscript: 'va',
              vexflow: {
                note: opts.vexflow.staveNote,
                textBracketPosition: vexflow.TextBracketPosition.TOP,
              },
            });
            break;
          case 'continue':
            opts.spanners.addOctaveShiftFragment({
              type: 'continue',
              vexflow: { note: opts.vexflow.staveNote },
            });
            break;
          case 'stop':
            opts.spanners.addOctaveShiftFragment({
              type: 'stop',
              vexflow: { note: opts.vexflow.staveNote },
            });
            break;
        }
      });
  }
}

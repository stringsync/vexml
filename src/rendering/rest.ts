import * as vexflow from 'vexflow';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as conversions from './conversions';
import { Config } from './config';
import { NoteDurationDenominator } from './enums';
import { Clef } from './clef';
import { Token } from './token';
import { SpannerFragment } from './legacyspanners';
import { OctaveShiftFragment } from './octaveshift';
import { Spanners } from './spanners';

/** The result of rendering a Rest. */
export type RestRendering = {
  type: 'rest';
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  spannerFragments: SpannerFragment[];
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
  render(opts: { voiceEntryCount: number; spanners: Spanners }): RestRendering {
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

    this.addSpannerFragments({
      spanners: opts.spanners,
      vexflow: { staveNote: vfStaveNote },
    });

    return {
      type: 'rest',
      vexflow: { staveNote: vfStaveNote },
      spannerFragments: this.getSpannerFragments(vfStaveNote),
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

  // TODO: Unify these with Note's implementation, although they may not overlap 1:1.
  private getSpannerFragments(vfStaveNote: vexflow.StaveNote): SpannerFragment[] {
    return [...this.getOctaveShiftFragments(vfStaveNote)];
  }

  private getOctaveShiftFragments(vfStaveNote: vexflow.StaveNote): OctaveShiftFragment[] {
    return this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.OctaveShiftDirectionTypeContent => content.type === 'octaveshift')
      .map((content) => content.octaveShift)
      .map<OctaveShiftFragment>((octaveShift) => {
        switch (octaveShift.getType()) {
          case 'up':
            return {
              type: 'octaveshift',
              phase: 'start',
              text: octaveShift.getSize().toString(),
              superscript: 'mb',
              vexflow: { note: vfStaveNote, textBracketPosition: vexflow.TextBracketPosition.BOTTOM },
            };
          case 'down':
            return {
              type: 'octaveshift',
              phase: 'start',
              text: octaveShift.getSize().toString(),
              superscript: 'va',
              vexflow: { note: vfStaveNote, textBracketPosition: vexflow.TextBracketPosition.TOP },
            };
          case 'continue':
            return {
              type: 'octaveshift',
              phase: 'continue',
              vexflow: { note: vfStaveNote },
            };
          case 'stop':
            return {
              type: 'octaveshift',
              phase: 'stop',
              vexflow: { note: vfStaveNote },
            };
        }
      });
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

  private addSpannerFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    this.addBeamFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
    this.addTupletFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
    this.addWedgeFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
    this.addPedalFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
    this.addVibratoFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
  }

  private addWedgeFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    // For applications where a specific direction is indeed attached to a specific note, the <direction> element can be
    // associated with the first <note> element that follows it in score order that is not in a different voice.
    // See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction/

    for (const direction of this.musicXml.directions) {
      const directionPlacement = direction.getPlacement() ?? 'below';
      const modifierPosition = conversions.fromAboveBelowToModifierPosition(directionPlacement);

      for (const directionType of direction.getTypes()) {
        const content = directionType.getContent();
        if (content.type !== 'wedge') {
          continue;
        }

        const wedgeType = content.wedge.getType();

        switch (wedgeType) {
          case 'crescendo':
          case 'diminuendo':
            opts.spanners.addWedgeFragment({
              type: 'start',
              vexflow: {
                note: opts.vexflow.staveNote,
                staveHairpinType: conversions.fromWedgeTypeToStaveHairpinType(wedgeType),
                position: modifierPosition,
              },
            });
            break;
          case 'continue':
          case 'stop':
            opts.spanners.addWedgeFragment({
              type: wedgeType,
              vexflow: {
                note: opts.vexflow.staveNote,
              },
            });
        }
      }
    }
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

  private addBeamFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    const beam = util.first(this.musicXml.note?.getBeams() ?? []);
    if (beam) {
      opts.spanners.addBeamFragment({
        type: beam.getBeamValue(),
        vexflow: {
          stemmableNote: opts.vexflow.staveNote,
        },
      });
    }
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
}

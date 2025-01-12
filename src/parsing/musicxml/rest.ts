import * as data from '@/data';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import { Fraction } from './fraction';
import { Pitch } from './pitch';
import { VoiceContext, VoiceEntryContext } from './contexts';
import { Time } from './time';
import { Beam } from './beam';
import { Tuplet } from './tuplet';

export class Rest {
  constructor(
    private measureBeat: util.Fraction,
    private durationType: data.DurationType,
    private dotCount: number,
    private duration: util.Fraction,
    private displayStep: string | null,
    private displayOctave: number | null,
    private beam: Beam | null,
    private tuplets: Tuplet[]
  ) {}

  static create(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Rest {
    util.assert(musicXML.note.isRest(), 'Expected note to be a rest');

    const displayStep = musicXML.note.getRestDisplayStep();
    const displayOctave = musicXML.note.getRestDisplayOctave();
    let durationType = conversions.fromNoteTypeToDurationType(musicXML.note.getType());
    let dotCount = musicXML.note.getDotCount();
    if (!durationType) {
      [durationType, dotCount] = conversions.fromFractionToDurationType(duration);
    }

    let beam: Beam | null = null;
    if (musicXML.note.getBeams().length > 0) {
      beam = Beam.create({ beam: musicXML.note.getBeams().at(0)! });
    }

    const tuplets = musicXML.note
      .getNotations()
      .flatMap((n) => n.getTuplets())
      .map((tuplet) => Tuplet.create({ tuplet }));

    return new Rest(measureBeat, durationType, dotCount, duration, displayStep, displayOctave, beam, tuplets);
  }

  static whole(time: Time): Rest {
    const measureBeat = util.Fraction.zero();
    const duration = time.toFraction().multiply(new util.Fraction(4, 1));
    const [durationType, dotCount] = conversions.fromFractionToDurationType(duration);
    return new Rest(measureBeat, durationType, dotCount, duration, null, null, null, []);
  }

  parse(voiceCtx: VoiceContext): data.Rest {
    const voiceEntryCtx = VoiceEntryContext.rest(voiceCtx);

    const tupletIds = util.unique([
      ...this.tuplets.map((tuplet) => tuplet.parse(voiceEntryCtx)).filter((id) => id !== null),
      ...voiceEntryCtx.continueOpenTuplets(),
    ]);

    return {
      type: 'rest',
      durationType: this.durationType,
      dotCount: this.dotCount,
      measureBeat: this.getMeasureBeat().parse(),
      duration: this.getDuration().parse(),
      displayPitch: this.getDisplayPitch()?.parse() ?? null,
      beamId: this.beam?.parse(voiceEntryCtx) ?? null,
      pedalMark: voiceEntryCtx.continueOpenPedal(),
      tupletIds,
    };
  }

  private getMeasureBeat(): Fraction {
    return new Fraction(this.measureBeat);
  }

  private getDuration(): Fraction {
    return new Fraction(this.duration);
  }

  private getDisplayPitch(): Pitch | null {
    if (!this.displayStep || this.displayOctave === null) {
      return null;
    }
    return new Pitch(this.displayStep, this.displayOctave);
  }
}

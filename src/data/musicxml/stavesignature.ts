import * as data from '@/data';
import * as util from '@/util';
import { ScorePartwise } from '../../musicxml/scorepartwise';
import { Attributes } from '../../musicxml/attributes';
import { Direction } from '../../musicxml/direction';
import { Time } from '../../musicxml/time';
import { Metronome } from '../../musicxml/metronome';
import { Clef } from '../../musicxml/clef';
import { Key } from '../../musicxml/key';

export class StaveSignature {
  constructor(
    public readonly metronome: data.Metronome,
    public readonly clefs: data.Clef[],
    public readonly keySignatures: data.KeySignature[],
    public readonly timeSignatures: data.TimeSignature[],
    public readonly quarterNoteDivisions: data.QuarterNoteDivisions[]
  ) {}

  /** Returns the first stave signature in the score. */
  static initialize(scorePartwise: ScorePartwise): StaveSignature {
    const clefs = new Array<data.Clef>();
    const keySignatures = new Array<data.KeySignature>();
    const timeSignatures = new Array<data.TimeSignature>();
    const quarterNoteDivisions = new Array<data.QuarterNoteDivisions>();

    for (const part of scorePartwise.getParts()) {
      const partId = part.getId();

      const attributes = part
        .getMeasures()
        .flatMap((measure) => measure.getAttributes())
        .filter((attributes): attributes is Attributes => attributes instanceof Attributes);

      quarterNoteDivisions.push({
        partId,
        value: util.first(attributes.map((attributes) => attributes.getQuarterNoteDivisions())) ?? 1,
      });

      const staveCount = util.first(attributes.map((attributes) => attributes.getStaveCount())) ?? 1;

      for (let staveNumber = 1; staveNumber <= staveCount; staveNumber++) {
        const clef = attributes
          .flatMap((attributes) => attributes.getClefs())
          .find((clef) => staveNumber === clef.getStaveNumber());
        clefs.push(toClef(clef, partId, staveNumber));

        const key = attributes
          .flatMap((attributes) => attributes.getKeys())
          .find((key) => staveNumber === key.getStaveNumber());
        keySignatures.push(toKeySignature(key, partId, staveNumber));

        // TODO: Use the actual time signature.
        const time = attributes
          .flatMap((attributes) => attributes.getTimes())
          .find((time) => staveNumber === time.getStaveNumber());
        timeSignatures.push(toTimeSignature(time, partId, staveNumber));
      }
    }

    const metronome = toMetronome(
      scorePartwise
        .getParts()
        .flatMap((part) => part.getMeasures().flatMap((measure) => measure.getEntries()))
        .filter((entry): entry is Direction => entry instanceof Direction)
        .flatMap((direction) => direction.getMetronomes())
        .at(0)
    );

    return new StaveSignature(metronome, clefs, keySignatures, timeSignatures, quarterNoteDivisions);
  }

  static fromStaveSignatureLike(staveSignatureLike: data.StaveSignature): StaveSignature {
    return new StaveSignature(
      staveSignatureLike.metronome,
      staveSignatureLike.clefs,
      staveSignatureLike.keySignatures,
      staveSignatureLike.timeSignatures,
      staveSignatureLike.quarterNoteDivisions
    );
  }

  updateAttributes(attributes: Attributes) {}

  updateDirection(direction: Direction) {}
}

function toClef(clef: Clef | undefined, partId: string, staveNumber: number): data.Clef {
  return {
    partId,
    staveNumber,
    sign: clef?.getSign() ?? 'G',
    line: clef?.getLine() ?? null,
    octaveChange: clef?.getOctaveChange() ?? null,
  };
}

function toKeySignature(key: Key | undefined, partId: string, staveNumber: number): data.KeySignature {
  return {
    partId,
    staveNumber,
    previousKeySignature: null,
    fifths: key?.getFifthsCount() ?? 0,
    mode: key?.getMode() ?? 'none',
  };
}

// TODO: Implement.
function toTimeSignature(time: Time | undefined, partId: string, staveNumber: number): data.TimeSignature {
  return {
    partId,
    staveNumber,
    components: [new util.Fraction(4, 4)],
  };
}

// TODO: Implement.
function toMetronome(metronome: Metronome | undefined): data.Metronome {
  return { bpm: 120 };
}

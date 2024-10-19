import * as rendering from '@/rendering';
import * as util from '@/util';

export type Step = {
  ticks: number;
  repeat: number;
  measure: rendering.MeasureRendering;
  tickable: Tickable;
};

type Tickable = rendering.VoiceEntryRendering | rendering.MultiRestRendering;

/** Represents a sequence of steps needed for playback. */
export class Sequence {
  private partId: string;
  private steps: Step[];

  private constructor(partId: string, steps: Step[]) {
    this.partId = partId;
    this.steps = steps;
  }

  static fromScoreRendering(score: rendering.ScoreRendering): Sequence[] {
    const measures = score.systems.flatMap((system) => system.measures);
    return score.partIds.map((partId) => Sequence.fromMeasureRenderings(partId, measures));
  }

  private static fromMeasureRenderings(partId: string, measures: rendering.MeasureRendering[]): Sequence {
    const steps = new Array<Step>();

    // TODO: Determine the number of ticks per beat for measure rests.
    let ticks = 0;

    for (const measure of measures) {
      const tickables = measure.fragments
        .flatMap((fragment) => fragment.parts)
        .filter((part) => part.id === partId)
        .flatMap((part) => part.staves)
        .map((stave) => stave.entry)
        .flatMap<Tickable>((entry) => {
          switch (entry.type) {
            case 'chorus':
              return entry.voices.flatMap((voice) => voice.entries);
            case 'measurerest':
              return [entry];
            default:
              return [];
          }
        });

      for (const tickable of tickables) {
        switch (tickable.type) {
          case 'measurerest':
            // TODO: Determine tick based on the number of measures.
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'rest':
            ticks += tickable.vexflow.note.getTicks().quotient();
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'ghostnote':
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'gracenote':
            ticks += tickable.vexflow.graceNote.getTicks().quotient();
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'gracechord':
            ticks += util.first(tickable.graceNotes)?.vexflow.graceNote.getTicks()?.quotient() ?? 0;
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'stavechord':
            ticks += util.first(tickable.notes)?.vexflow.staveNote.getTicks().quotient() ?? 0;
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'stavenote':
            ticks += tickable.vexflow.staveNote.getTicks().quotient();
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'symbolnote':
            // We purposely ignore symbol notes since they are not played.
            break;
          case 'tabgracenote':
            ticks += tickable.vexflow.graceTabNote.getTicks().quotient();
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'tabgracechord':
            ticks += util.first(tickable.tabGraceNotes)?.vexflow.graceTabNote.getTicks().quotient() ?? 0;
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'tabnote':
            ticks += tickable.vexflow.tabNote.getTicks().quotient();
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
          case 'tabchord':
            ticks += util.first(tickable.tabNotes)?.vexflow.tabNote.getTicks().quotient() ?? 0;
            steps.push({ ticks, repeat: 1, measure, tickable });
            break;
        }
      }
    }

    return new Sequence(partId, steps);
  }

  get length() {
    return this.steps.length;
  }

  at(index: number): Step | null {
    return this.steps[index] ?? null;
  }

  getPartId(): string {
    return this.partId;
  }
}

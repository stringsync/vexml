import * as util from '@/util';
import * as data from '@/data';
import { Fraction } from '@/util';
import { FragmentComponent, FragmentPart, MeasureEvent, PartSignature } from './types';

type FragmentBoundary = {
  partId: string;
  beat: Fraction;
  changes: FragmentComponent[];
};

export class FragmentPartFactory {
  constructor(
    private measureCount: number,
    private partSignatures: PartSignature[],
    private measureEvents: MeasureEvent[]
  ) {}

  create(): FragmentPart[] {
    const result = new Array<FragmentPart>();

    const boundaries = this.getPartIds()
      .flatMap((partId) => this.getFragmentBoundaries(partId))
      .sort((a, b) => a.beat.toDecimal() - b.beat.toDecimal());

    const beats = util.uniqueBy(
      boundaries.map((boundary) => boundary.beat),
      (beat) => beat.toDecimal()
    );

    // partId -> measureIndex -> fragmentIndex
    const fragmentIndexes: Record<string, Record<number, number>> = {};

    for (let index = 1; index <= beats.length - 1; index++) {
      const startBeat = beats[index - 1];
      const endBeat = beats[index];

      const startBoundaries = boundaries.filter((boundary) => boundary.beat.isEquivalent(startBeat));

      for (const partId of this.getPartIds()) {
        const measureEvents = this.measureEvents
          .filter((measureEvent) => measureEvent.partId === partId)
          .filter((measureEvent) => Fraction.fromFractionLike(measureEvent.beat).toDecimal() >= startBeat.toDecimal())
          .filter((measureEvent) => Fraction.fromFractionLike(measureEvent.beat).toDecimal() < endBeat.toDecimal());

        const changes = startBoundaries.find((boundary) => boundary.partId === partId)?.changes ?? [];

        const measureIndexes = util.unique(measureEvents.map((measureEvent) => measureEvent.measureIndex));

        for (const measureIndex of measureIndexes) {
          fragmentIndexes[partId] ??= {};
          fragmentIndexes[partId][measureIndex] ??= 0;
          const fragmentIndex = fragmentIndexes[partId][measureIndex];
          fragmentIndexes[partId][measureIndex]++;

          result.push({
            partId,
            measureIndex,
            fragmentIndex,
            changes,
            events: measureEvents.filter((measureEvent) => measureEvent.measureIndex === measureIndex),
          });
        }
      }
    }

    return result;
  }

  private getPartIds() {
    return this.partSignatures.map((signature) => signature.partId);
  }

  private getFragmentBoundaries(partId: string) {
    const result = new Array<FragmentBoundary>();

    result.push({ partId, beat: Fraction.zero(), changes: [] });
    result.push({ partId, beat: Fraction.max(), changes: [] });

    let currentFragmentSignature: data.FragmentSignature | null = null;

    for (let measureIndex = 0; measureIndex < this.measureCount; measureIndex++) {
      const measureEvents = this.measureEvents
        .filter((event) => event.partId === partId)
        .filter((event) => event.measureIndex === measureIndex);

      for (const measureEvent of measureEvents) {
        const beforeFragmentSignature = currentFragmentSignature;
        const afterFragmentSignature = measureEvent.fragmentSignature;

        let changes = new Array<FragmentComponent>();
        if (beforeFragmentSignature && afterFragmentSignature) {
          changes = this.getChangedFragmentSignatureComponents(beforeFragmentSignature, afterFragmentSignature);
        }

        if (changes.length > 0) {
          result.push({ partId, beat: Fraction.fromFractionLike(measureEvent.beat), changes });
        }

        currentFragmentSignature = afterFragmentSignature;
      }
    }

    result.sort(
      (a, b) => Fraction.fromFractionLike(a.beat).toDecimal() - Fraction.fromFractionLike(b.beat).toDecimal()
    );

    return result;
  }

  private getChangedFragmentSignatureComponents(
    before: data.FragmentSignature,
    after: data.FragmentSignature
  ): FragmentComponent[] {
    const changes = new Array<FragmentComponent>();

    if (!this.areMetronomesEquivalent(before.metronome, after.metronome)) {
      changes.push('metronome');
    }

    for (const beforeClef of before.clefs) {
      const afterClef = after.clefs.find(
        (clef) => clef.partId === beforeClef.partId && clef.staveNumber === beforeClef.staveNumber
      );
      if (!afterClef || !this.areClefsEquivalent(beforeClef, afterClef)) {
        changes.push('clef');
        break;
      }
    }

    for (const beforeKeySignature of before.keySignatures) {
      const afterKeySignature = after.keySignatures.find(
        (keySignature) =>
          keySignature.partId === beforeKeySignature.partId &&
          keySignature.staveNumber === beforeKeySignature.staveNumber
      );
      if (!afterKeySignature || !this.areKeySignaturesEquivalent(beforeKeySignature, afterKeySignature)) {
        changes.push('keysignature');
        break;
      }
    }

    for (const beforeTimeSignature of before.timeSignatures) {
      const afterTimeSignature = after.timeSignatures.find(
        (timeSignature) =>
          timeSignature.partId === beforeTimeSignature.partId &&
          timeSignature.staveNumber === beforeTimeSignature.staveNumber
      );
      if (!afterTimeSignature || !this.areTimeSignaturesEquivalent(beforeTimeSignature, afterTimeSignature)) {
        changes.push('timesignature');
        break;
      }
    }

    for (const beforeStaveLineCount of before.staveLineCounts) {
      const afterStaveLineCount = after.staveLineCounts.find(
        (staveLineCount) =>
          staveLineCount.partId === beforeStaveLineCount.partId &&
          staveLineCount.staveNumber === beforeStaveLineCount.staveNumber
      );
      if (!afterStaveLineCount || !this.areStaveLineCountsEquivalent(beforeStaveLineCount, afterStaveLineCount)) {
        changes.push('stavelinecount');
        break;
      }
    }

    return changes;
  }

  private areMetronomesEquivalent(a: data.Metronome, b: data.Metronome): boolean {
    return (
      a.name === b.name &&
      a.parenthesis === b.parenthesis &&
      a.duration === b.duration &&
      a.dots === b.dots &&
      a.bpm === b.bpm &&
      a.duration2 === b.duration2 &&
      a.dots2 === b.dots2
    );
  }

  private areClefsEquivalent(a: data.Clef, b: data.Clef): boolean {
    return a.sign === b.sign && a.line === b.line && a.octaveChange === b.octaveChange;
  }

  private areKeySignaturesEquivalent(a: data.KeySignature, b: data.KeySignature): boolean {
    return a.fifths === b.fifths && a.mode === b.mode;
  }

  private areTimeSignaturesEquivalent(a: data.TimeSignature, b: data.TimeSignature): boolean {
    if (a.components.length !== b.components.length) {
      return false;
    }
    for (let i = 0; i < a.components.length; i++) {
      const fractionA = Fraction.fromFractionLike(a.components[i]);
      const fractionB = Fraction.fromFractionLike(b.components[i]);
      if (!fractionA.isEqual(fractionB)) {
        return false;
      }
    }
    return true;
  }

  private areStaveLineCountsEquivalent(a: data.StaveLineCount, b: data.StaveLineCount): boolean {
    return a.lineCount === b.lineCount;
  }
}

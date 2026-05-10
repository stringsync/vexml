import * as data from '@/data';
import * as util from '@/util';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { MeasureRender } from '@/rendering';
import { Fraction } from '@/util';

/**
 * Reserved padding (pixels) subtracted from the system width when computing the per-piece budget. Accounts for the
 * courtesy clef/key/time modifiers that the rendering engine prepends to each piece (every piece becomes the first
 * measure of its own system) plus barline padding.
 */
const RESERVED_PADDING = 80;

export type EligibilityResult = { eligible: true } | { eligible: false; reason: string };

type EntryView = {
  measureBeat: Fraction;
  duration: Fraction;
  beamId: string | null;
  tupletIds: string[];
  rectRight: number;
};

type SplitResult = {
  pieces: data.Measure[];
  pieceWidths: number[];
};

export class MeasureSplitter {
  constructor(private config: Config, private log: Logger) {}

  isEligible(measure: data.Measure, measureRender: MeasureRender): EligibilityResult {
    const threshold = this.config.CONTINUATION_MEASURE_WIDTH_THRESHOLD;
    if (threshold === null) {
      return { eligible: false, reason: 'feature disabled (threshold is null)' };
    }
    if (measureRender.rect.w <= threshold) {
      return { eligible: false, reason: 'measure already fits within threshold' };
    }
    if (measure.fragments.some((f) => f.kind === 'nonmusical')) {
      return { eligible: false, reason: 'measure contains a non-musical (gap) fragment' };
    }
    if (measure.fragments.some((f) => typeof f.minWidth === 'number' && f.minWidth > 0)) {
      return { eligible: false, reason: 'fragment has explicit minWidth' };
    }
    if (measureRender.multiRestCount > 1) {
      return { eligible: false, reason: 'multi-rest measure' };
    }
    if (
      measure.startBarlineStyle === 'repeatstart' ||
      measure.startBarlineStyle === 'repeatboth' ||
      measure.endBarlineStyle === 'repeatend' ||
      measure.endBarlineStyle === 'repeatboth'
    ) {
      return { eligible: false, reason: 'measure has repeat barlines' };
    }
    if (measure.jumps.some((j) => j.type === 'repeatending')) {
      return { eligible: false, reason: 'measure has volta (repeat ending)' };
    }
    if (measure.continuation !== null) {
      return { eligible: false, reason: 'measure is already a continuation piece' };
    }
    return { eligible: true };
  }

  /** Returns the resulting pieces and their widths. Length 1 means no split was performed. */
  split(measure: data.Measure, measureRender: MeasureRender): SplitResult {
    const noSplit: SplitResult = { pieces: [measure], pieceWidths: [measureRender.rect.w] };

    const reject = (reason: string): SplitResult => {
      this.log.debug('measure ineligible for continuation', { absoluteIndex: measureRender.absoluteIndex, reason });
      return noSplit;
    };

    const eligibility = this.isEligible(measure, measureRender);
    if (!eligibility.eligible) {
      return reject(eligibility.reason);
    }

    const width = this.config.WIDTH;
    if (width === null) {
      return reject('WIDTH is null');
    }

    const splitWidth = width - RESERVED_PADDING;
    if (splitWidth <= 0) {
      return reject('system width too small after reserved padding');
    }

    if (measureRender.rect.w <= splitWidth) {
      return reject('measure fits within system width despite exceeding threshold');
    }

    const entryViews = this.collectEntryViews(measure, measureRender);
    if (entryViews.length === 0) {
      return reject('no entries to split');
    }

    const candidates = this.findCandidateSplitBeats(measure, entryViews);
    if (candidates.length === 0) {
      return reject('no valid split candidates (beams/tuplets/voices block all)');
    }

    const layout = this.findBalancedLayout(measureRender, entryViews, candidates, splitWidth);
    if (!layout) {
      return reject('no balanced split fits within system width');
    }

    const pieces = this.buildPieces(measure, layout.boundaries);
    return { pieces, pieceWidths: layout.pieceWidths };
  }

  private collectEntryViews(measure: data.Measure, measureRender: MeasureRender): EntryView[] {
    const views: EntryView[] = [];
    for (const fragmentRender of measureRender.fragmentRenders) {
      const fragment = measure.fragments[fragmentRender.key.fragmentIndex];
      if (!fragment || fragment.kind === 'nonmusical') {
        continue;
      }
      for (const partRender of fragmentRender.partRenders) {
        const part = fragment.parts[partRender.key.partIndex];
        if (!part) {
          continue;
        }
        for (const staveRender of partRender.staveRenders) {
          const stave = part.staves[staveRender.key.staveIndex];
          if (!stave) {
            continue;
          }
          for (const voiceRender of staveRender.voiceRenders) {
            const voice = stave.voices[voiceRender.key.voiceIndex];
            if (!voice) {
              continue;
            }
            for (const entryRender of voiceRender.entryRenders) {
              const entry = voice.entries[entryRender.key.voiceEntryIndex];
              if (!entry) {
                continue;
              }
              views.push({
                measureBeat: Fraction.fromFractionLike(entry.measureBeat),
                duration: Fraction.fromFractionLike(entry.duration),
                beamId: this.getBeamId(entry),
                tupletIds: this.getTupletIds(entry),
                rectRight: entryRender.rect.right(),
              });
            }
          }
        }
      }
    }
    return views;
  }

  private getBeamId(entry: data.VoiceEntry): string | null {
    if (entry.type === 'note' || entry.type === 'chord' || entry.type === 'rest') {
      return entry.beamId;
    }
    return null;
  }

  private getTupletIds(entry: data.VoiceEntry): string[] {
    if (entry.type === 'note' || entry.type === 'chord' || entry.type === 'rest') {
      return entry.tupletIds;
    }
    return [];
  }

  /** Returns valid candidate split beats sorted ascending. Excludes beat 0 and beat >= measure end. */
  private findCandidateSplitBeats(measure: data.Measure, entryViews: EntryView[]): Fraction[] {
    const positive = entryViews.filter((v) => v.measureBeat.toDecimal() > 0).map((v) => v.measureBeat);
    const sorted = util.sortBy(
      util.uniqueBy(positive, (b) => b.toDecimal()),
      (b) => b.toDecimal()
    );
    return sorted.filter((boundary) => this.isValidSplit(measure, entryViews, boundary));
  }

  private isValidSplit(measure: data.Measure, entryViews: EntryView[], boundary: Fraction): boolean {
    // 1. No entry can span the boundary.
    for (const v of entryViews) {
      const start = v.measureBeat;
      const end = start.add(v.duration);
      if (start.isLessThan(boundary) && end.isGreaterThan(boundary)) {
        return false;
      }
    }
    // 2. No beam or tuplet can span the boundary (within any voice).
    for (const fragment of measure.fragments) {
      if (fragment.kind === 'nonmusical') {
        continue;
      }
      for (const part of fragment.parts) {
        for (const stave of part.staves) {
          for (const voice of stave.voices) {
            const beamHasBefore = new Set<string>();
            const beamHasAtOrAfter = new Set<string>();
            const tupletHasBefore = new Set<string>();
            const tupletHasAtOrAfter = new Set<string>();
            for (const entry of voice.entries) {
              const start = Fraction.fromFractionLike(entry.measureBeat);
              const isBefore = start.isLessThan(boundary);
              const beamId = this.getBeamId(entry);
              const tupletIds = this.getTupletIds(entry);
              if (beamId) {
                if (isBefore) {
                  beamHasBefore.add(beamId);
                } else {
                  beamHasAtOrAfter.add(beamId);
                }
              }
              for (const tid of tupletIds) {
                if (isBefore) {
                  tupletHasBefore.add(tid);
                } else {
                  tupletHasAtOrAfter.add(tid);
                }
              }
            }
            for (const id of beamHasBefore) {
              if (beamHasAtOrAfter.has(id)) {
                return false;
              }
            }
            for (const id of tupletHasBefore) {
              if (tupletHasAtOrAfter.has(id)) {
                return false;
              }
            }
          }
        }
      }
    }
    return true;
  }

  /**
   * Target-balanced layout: try N = ceil(measureWidth / splitWidth) pieces, snapping each ideal boundary to the nearest
   * candidate. If any piece exceeds `splitWidth`, retry with N + 1 (more pieces flatten the largest piece). Returns
   * null if no N up to a sensible cap satisfies the budget.
   */
  private findBalancedLayout(
    measureRender: MeasureRender,
    entryViews: EntryView[],
    candidates: Fraction[],
    splitWidth: number
  ): { boundaries: Fraction[]; pieceWidths: number[] } | null {
    const measureLeft = measureRender.rect.left();
    const measureWidth = measureRender.rect.w;

    const widthAt = (boundary: Fraction): number => {
      const rights = entryViews.filter((v) => v.measureBeat.isLessThan(boundary)).map((v) => v.rectRight);
      return util.max(rights, measureLeft) - measureLeft;
    };

    const candidateWidths = candidates.map(widthAt);

    const minPieces = Math.max(2, Math.ceil(measureWidth / splitWidth));
    const maxPieces = Math.min(candidates.length + 1, minPieces + candidates.length);

    for (let n = minPieces; n <= maxPieces; n++) {
      const target = measureWidth / n;
      const usedIndices = new Set<number>();
      const boundaryIndices: number[] = [];
      let prevWidth = 0;
      let valid = true;

      for (let i = 1; i < n; i++) {
        const idealW = i * target;
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let ci = 0; ci < candidates.length; ci++) {
          if (usedIndices.has(ci)) {
            continue;
          }
          const w = candidateWidths[ci];
          if (w <= prevWidth) {
            continue;
          }
          const dist = Math.abs(w - idealW);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = ci;
          }
        }
        if (bestIdx === -1) {
          valid = false;
          break;
        }
        boundaryIndices.push(bestIdx);
        usedIndices.add(bestIdx);
        prevWidth = candidateWidths[bestIdx];
      }

      if (!valid) {
        continue;
      }

      boundaryIndices.sort((a, b) => candidateWidths[a] - candidateWidths[b]);
      const boundaries = boundaryIndices.map((bi) => candidates[bi]);

      const pieceWidths: number[] = [];
      let prevW = 0;
      for (const bi of boundaryIndices) {
        const w = candidateWidths[bi];
        pieceWidths.push(w - prevW);
        prevW = w;
      }
      pieceWidths.push(measureWidth - prevW);

      if (pieceWidths.every((w) => w <= splitWidth)) {
        return { boundaries, pieceWidths };
      }
    }

    return null;
  }

  private buildPieces(measure: data.Measure, boundaries: Fraction[]): data.Measure[] {
    const total = boundaries.length + 1;

    const ranges: Array<{ start: Fraction; end: Fraction }> = [];
    let prev: Fraction = Fraction.zero();
    for (const b of boundaries) {
      ranges.push({ start: prev, end: b });
      prev = b;
    }
    ranges.push({ start: prev, end: Fraction.max() });

    return ranges.map((range, index) => this.buildPiece(measure, range, index, total));
  }

  private buildPiece(
    measure: data.Measure,
    range: { start: Fraction; end: Fraction },
    index: number,
    total: number
  ): data.Measure {
    const isFirst = index === 0;
    const isLast = index === total - 1;

    const pieceFragments: data.Fragment[] = measure.fragments.map((fragment) => {
      const cloned = util.deepClone(fragment);
      if (cloned.kind === 'nonmusical') {
        return cloned;
      }
      cloned.parts = cloned.parts.map((part) => ({
        ...part,
        staves: part.staves.map((stave) => ({
          ...stave,
          voices: stave.voices.map((voice) => this.partitionVoice(voice, range)),
        })),
      }));
      return cloned;
    });

    return {
      type: 'measure',
      label: isFirst ? measure.label : null,
      fragments: pieceFragments,
      jumps: isFirst ? util.deepClone(measure.jumps) : [],
      startBarlineStyle: isFirst ? measure.startBarlineStyle : 'none',
      endBarlineStyle: isLast ? measure.endBarlineStyle : 'none',
      repetitionSymbols: isFirst ? [...measure.repetitionSymbols] : [],
      continuation: { type: 'continuation', index, total },
    };
  }

  private partitionVoice(voice: data.Voice, range: { start: Fraction; end: Fraction }): data.Voice {
    const inRange = (entry: data.VoiceEntry) => {
      const start = Fraction.fromFractionLike(entry.measureBeat);
      return start.isGreaterThanOrEqualTo(range.start) && start.isLessThan(range.end);
    };
    // Shift each entry's measureBeat so the piece starts at 0. Without this, the voice renderer would insert a
    // ghost note for the silent prefix and squeeze the piece's notes into a fraction of the available width.
    const filteredEntries = voice.entries.filter(inRange).map((e) => {
      const cloned = util.deepClone(e);
      const shifted = Fraction.fromFractionLike(cloned.measureBeat).subtract(range.start);
      cloned.measureBeat = { type: 'fraction', ...shifted.toFractionLike() };
      return cloned;
    });

    const usedBeamIds = new Set<string>();
    const usedTupletIds = new Set<string>();
    for (const entry of filteredEntries) {
      const beamId = this.getBeamId(entry);
      if (beamId) {
        usedBeamIds.add(beamId);
      }
      for (const tid of this.getTupletIds(entry)) {
        usedTupletIds.add(tid);
      }
    }

    return {
      type: 'voice',
      entries: filteredEntries,
      beams: voice.beams.filter((b) => usedBeamIds.has(b.id)).map((b) => util.deepClone(b)),
      tuplets: voice.tuplets.filter((t) => usedTupletIds.has(t.id)).map((t) => util.deepClone(t)),
    };
  }
}

import * as data from '@/data';
import { Config, DEFAULT_CONFIG } from '@/config';
import { MemoryLogger } from '@/debug';
import { MeasureSplitter } from '@/formatting/measuresplitter';
import { MeasureRender } from '@/rendering';
import { Rect } from '@/spatial';

describe(MeasureSplitter, () => {
  describe('isEligible', () => {
    it('rejects when threshold is null', () => {
      const log = new MemoryLogger();
      const splitter = new MeasureSplitter(makeConfig(null), log);
      const result = splitter.isEligible(makeMeasure(), makeMeasureRender());
      expect(result).toEqual({ eligible: false, reason: 'feature disabled (threshold is null)' });
    });

    it('rejects when measure already fits within threshold', () => {
      const splitter = new MeasureSplitter(makeConfig(2000), new MemoryLogger());
      const result = splitter.isEligible(makeMeasure(), makeMeasureRender({ rect: new Rect(0, 0, 500, 100) }));
      expect(result).toEqual({ eligible: false, reason: 'measure already fits within threshold' });
    });

    it('rejects when the measure contains a non-musical fragment', () => {
      const splitter = new MeasureSplitter(makeConfig(500), new MemoryLogger());
      const measure = makeMeasure({
        fragments: [
          {
            type: 'fragment',
            kind: 'nonmusical',
            signature: { type: 'fragmentsignature', metronome: { type: 'metronome', playbackBpm: 100 } },
            parts: [],
            minWidth: null,
            label: null,
            durationMs: 0,
          },
        ],
      });
      const result = splitter.isEligible(measure, makeMeasureRender());
      expect(result).toEqual({ eligible: false, reason: 'measure contains a non-musical (gap) fragment' });
    });

    it('rejects when a fragment has explicit minWidth', () => {
      const splitter = new MeasureSplitter(makeConfig(500), new MemoryLogger());
      const measure = makeMeasure({
        fragments: [
          {
            type: 'fragment',
            kind: 'musical',
            signature: { type: 'fragmentsignature', metronome: { type: 'metronome', playbackBpm: 100 } },
            parts: [],
            minWidth: 250,
          },
        ],
      });
      const result = splitter.isEligible(measure, makeMeasureRender());
      expect(result).toEqual({ eligible: false, reason: 'fragment has explicit minWidth' });
    });

    it('rejects multi-rest measures', () => {
      const splitter = new MeasureSplitter(makeConfig(500), new MemoryLogger());
      const result = splitter.isEligible(makeMeasure(), makeMeasureRender({ multiRestCount: 4 }));
      expect(result).toEqual({ eligible: false, reason: 'multi-rest measure' });
    });

    it.each(['repeatstart', 'repeatend', 'repeatboth'] as const)('rejects measures with %s barlines', (style) => {
      const splitter = new MeasureSplitter(makeConfig(500), new MemoryLogger());
      const measure = makeMeasure({
        startBarlineStyle: style === 'repeatend' ? null : style,
        endBarlineStyle: style === 'repeatstart' ? null : style,
      });
      const result = splitter.isEligible(measure, makeMeasureRender());
      expect(result).toEqual({ eligible: false, reason: 'measure has repeat barlines' });
    });

    it('rejects measures with voltas', () => {
      const splitter = new MeasureSplitter(makeConfig(500), new MemoryLogger());
      const measure = makeMeasure({
        jumps: [{ type: 'repeatending', times: 1, label: '1.', endingBracketType: 'begin' }],
      });
      const result = splitter.isEligible(measure, makeMeasureRender());
      expect(result).toEqual({ eligible: false, reason: 'measure has volta (repeat ending)' });
    });

    it('rejects measures that are already continuation pieces', () => {
      const splitter = new MeasureSplitter(makeConfig(500), new MemoryLogger());
      const measure = makeMeasure({
        continuation: { type: 'continuation', index: 0, total: 2 },
      });
      const result = splitter.isEligible(measure, makeMeasureRender());
      expect(result).toEqual({ eligible: false, reason: 'measure is already a continuation piece' });
    });

    it('accepts a wide musical measure with no special markings', () => {
      const splitter = new MeasureSplitter(makeConfig(500), new MemoryLogger());
      const result = splitter.isEligible(makeMeasure(), makeMeasureRender({ rect: new Rect(0, 0, 1000, 100) }));
      expect(result).toEqual({ eligible: true });
    });
  });

  describe('split', () => {
    it('returns the original measure unchanged when ineligible, and logs a debug reason', () => {
      const log = new MemoryLogger();
      const splitter = new MeasureSplitter(makeConfig(null), log);
      const measure = makeMeasure();
      const measureRender = makeMeasureRender();

      const { pieces, pieceWidths } = splitter.split(measure, measureRender);

      expect(pieces).toEqual([measure]);
      expect(pieceWidths).toEqual([measureRender.rect.w]);
      expect(log.getLogs()).toHaveLength(1);
      expect(log.getLogs()[0].message).toBe('measure ineligible for continuation');
      expect(log.getLogs()[0].meta).toMatchObject({ reason: 'feature disabled (threshold is null)' });
    });

    it('returns the original measure when there are no entries to split', () => {
      const log = new MemoryLogger();
      const splitter = new MeasureSplitter(makeConfig(500), log);
      const result = splitter.split(makeMeasure(), makeMeasureRender({ rect: new Rect(0, 0, 1000, 100) }));
      expect(result.pieces).toHaveLength(1);
      expect(log.getLogs().at(-1)?.meta?.reason).toBe('no entries to split');
    });

    it('returns the original measure when WIDTH is null', () => {
      const log = new MemoryLogger();
      const splitter = new MeasureSplitter(makeConfig(500, null), log);
      const result = splitter.split(makeMeasure(), makeMeasureRender({ rect: new Rect(0, 0, 1000, 100) }));
      expect(result.pieces).toHaveLength(1);
      expect(log.getLogs().at(-1)?.meta?.reason).toBe('WIDTH is null');
    });

    it('returns the original measure when it fits within the system width despite exceeding threshold', () => {
      const log = new MemoryLogger();
      // threshold=200 (eligible), WIDTH=1000 > splitWidth=920 > measure (rect.w=400) fits
      const splitter = new MeasureSplitter(makeConfig(200, 1000), log);
      const result = splitter.split(makeMeasure(), makeMeasureRender({ rect: new Rect(0, 0, 400, 100) }));
      expect(result.pieces).toHaveLength(1);
      expect(log.getLogs().at(-1)?.meta?.reason).toBe('measure fits within system width despite exceeding threshold');
    });
  });
});

function makeConfig(threshold: number | null, width: number | null = 600): Config {
  return { ...DEFAULT_CONFIG, CONTINUATION_MEASURE_WIDTH_THRESHOLD: threshold, WIDTH: width };
}

function makeMeasure(overrides: Partial<data.Measure> = {}): data.Measure {
  return {
    type: 'measure',
    label: 1,
    fragments: [],
    jumps: [],
    startBarlineStyle: null,
    endBarlineStyle: null,
    repetitionSymbols: [],
    continuation: null,
    ...overrides,
  };
}

function makeMeasureRender(overrides: Partial<MeasureRender> = {}): MeasureRender {
  return {
    type: 'measure',
    key: { systemIndex: 0, measureIndex: 0 },
    rect: new Rect(0, 0, 1000, 100),
    absoluteIndex: 0,
    fragmentRenders: [],
    multiRestCount: 0,
    jumps: [],
    continuation: null,
    ...overrides,
  };
}

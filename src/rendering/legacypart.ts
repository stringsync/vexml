import * as musicxml from '@/musicxml';
import { Measure, MeasureRendering } from './measure';
import { Config } from './config';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { MeasureEntry, StaveSignature } from './stavesignature';

const STAVE_CONNECTOR_BRACE_WIDTH = 16;

/** The result of rendering a Part. */
export type PartRendering = {
  id: string;
  vexflow: {
    staveConnector: vexflow.StaveConnector | null;
  };
  measures: MeasureRendering[];
};

/**
 * Represents a Part in a musical score, corresponding to the <part> element in MusicXML. This class encompasses the
 * entire musical content for a specific instrument or voice, potentially spanning multiple systems when rendered in the
 * viewport.
 */
export class LegacyPart {
  private config: Config;
  private musicXml: { part: musicxml.Part };
  private id: string;
  private systemId: symbol;
  private measures: Measure[];
  private staveCount: number;
  private noopMeasureCount: number;

  constructor(opts: {
    config: Config;
    id: string;
    musicXml: { part: musicxml.Part };
    systemId: symbol;
    measures: Measure[];
    staveCount: number;
    noopMeasureCount: number;
  }) {
    this.config = opts.config;
    this.id = opts.id;
    this.musicXml = opts.musicXml;
    this.systemId = opts.systemId;
    this.measures = opts.measures;
    this.staveCount = opts.staveCount;
    this.noopMeasureCount = opts.noopMeasureCount;
  }

  /** Creates a Part. */
  static create(opts: {
    config: Config;
    musicXml: { part: musicxml.Part };
    systemId: symbol;
    previousPart: LegacyPart | null;
    staveLayouts: musicxml.StaveLayout[];
  }): LegacyPart {
    const id = opts.musicXml.part.getId();
    const staveLayouts = opts.staveLayouts;

    const measureEntryGroups = StaveSignature.toMeasureEntryGroups({ part: opts.musicXml.part });
    const staveCount = util.max(
      measureEntryGroups
        .flat()
        .filter((entry): entry is StaveSignature => entry instanceof StaveSignature)
        .map((entry) => entry.getStaveCount())
    );

    let previousMeasure: Measure | null = null;
    let noopMeasureCount = opts.previousPart?.noopMeasureCount ?? 0;

    const measures = new Array<Measure>();
    const xmlMeasures = opts.musicXml.part.getMeasures();

    for (let measureIndex = 0; measureIndex < xmlMeasures.length; measureIndex++) {
      const xmlMeasure = xmlMeasures[measureIndex];

      // Don't create noop measures (typically <measures> after a multi measure rest).
      if (noopMeasureCount > 0) {
        noopMeasureCount--;
        continue;
      }

      // Get the first stave signature that matches the measure index or get the last stave signature seen before this
      // measure index.
      const staveSignatures = measureEntryGroups
        .flat()
        .filter((entry): entry is StaveSignature => entry instanceof StaveSignature)
        .filter((staveSignature) => staveSignature.getMeasureIndex() <= measureIndex);
      const leadingStaveSignature =
        staveSignatures.find((staveSignature) => staveSignature.getMeasureIndex() === measureIndex) ??
        util.last(staveSignatures);

      const measureEntries = measureEntryGroups[measureIndex];

      const measure: Measure = new Measure({
        // When splitting a system into smaller systems, the measure index should be maintained from when it was just
        // a single system. Therefore, this index should continue to be correct when a system is split.
        index: measureIndex,
        config: opts.config,
        musicXml: {
          measure: xmlMeasure,
          staveLayouts,
        },
        staveCount,
        systemId: opts.systemId,
        previousMeasure,
        leadingStaveSignature,
        measureEntries,
      });

      noopMeasureCount += measure.getMultiRestCount() - 1;
      measures.push(measure);
      previousMeasure = measure;
    }

    return new LegacyPart({
      config: opts.config,
      musicXml: {
        part: opts.musicXml.part,
      },
      id,
      systemId: opts.systemId,
      measures,
      staveCount,
      noopMeasureCount,
    });
  }

  /** Returns the measures of the Part. */
  getMeasures(): Measure[] {
    return this.measures;
  }

  /** Returns a measure at a specific index. */
  getMeasureAt(measureIndex: number): Measure | null {
    return this.measures[measureIndex] ?? null;
  }

  /** Slices the measures of the part using the indexes, clones, them, then creates a new Part from them. */
  slice(opts: { systemId: symbol; measureStartIndex: number; measureEndIndex: number }): LegacyPart {
    const measureStartIndex = opts.measureStartIndex;
    const measureEndIndex = opts.measureEndIndex;
    if (measureStartIndex < 0) {
      throw new Error(`measureStartIndex cannot be less than 0, got: ${measureStartIndex}`);
    }
    if (measureEndIndex > this.measures.length) {
      throw new Error(
        `measureEndIndex cannot be greater than measures length (${this.measures.length}), got: ${measureEndIndex}`
      );
    }

    let previousMeasure: Measure | null = null;

    const measures = this.measures.slice(opts.measureStartIndex, opts.measureEndIndex).map((measure) => {
      const nextMeasure = measure.clone(previousMeasure, opts.systemId);
      previousMeasure = nextMeasure;
      return nextMeasure;
    });

    return new LegacyPart({
      config: this.config,
      id: this.id,
      systemId: opts.systemId,
      measures,
      staveCount: this.staveCount,
      noopMeasureCount: this.noopMeasureCount,
      musicXml: this.musicXml,
    });
  }

  /** Renders the part. */
  render(opts: {
    x: number;
    y: number;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    isLastSystem: boolean;
    previousPart: LegacyPart | null;
    nextPart: LegacyPart | null;
  }): PartRendering {
    const measureRenderings = new Array<MeasureRendering>();

    let x = opts.x;
    const y = opts.y + this.getTopPadding();

    let vfStaveConnector: vexflow.StaveConnector | null = null;

    util.forEachTriple(this.measures, ([previousMeasure, currentMeasure, nextMeasure], { isFirst, isLast }) => {
      if (isFirst) {
        previousMeasure = util.last(opts.previousPart?.measures ?? []);
      }
      if (isLast) {
        nextMeasure = util.first(opts.nextPart?.measures ?? []);
      }

      const hasStaveConnectorBrace = isFirst && this.staveCount > 1;

      if (hasStaveConnectorBrace) {
        x += STAVE_CONNECTOR_BRACE_WIDTH;
      }

      const measureRendering = currentMeasure.render({
        x,
        y,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth: opts.minRequiredSystemWidth,
        targetSystemWidth: opts.targetSystemWidth,
        previousMeasure,
        nextMeasure,
      });
      measureRenderings.push(measureRendering);

      const staves = measureRendering.fragments.flatMap((fragment) => fragment.staves);
      if (hasStaveConnectorBrace) {
        const topStave = util.first(staves)!;
        const bottomStave = util.last(staves)!;

        vfStaveConnector = new vexflow.StaveConnector(topStave.vexflow.stave, bottomStave.vexflow.stave).setType(
          'brace'
        );
      }

      x += measureRendering.width;
    });

    return {
      id: this.id,
      vexflow: { staveConnector: vfStaveConnector },
      measures: measureRenderings,
    };
  }

  @util.memoize()
  private getMeasureEntryGroups(): MeasureEntry[][] {
    return StaveSignature.toMeasureEntryGroups({ part: this.musicXml.part });
  }

  /** Returns the top padding of the part. */
  private getTopPadding() {
    return util.max(this.measures.map((measure) => measure.getTopPadding()));
  }
}

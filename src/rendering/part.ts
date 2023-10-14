import * as musicxml from '@/musicxml';
import { Measure, MeasureRendering } from './measure';
import { Config } from './config';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { StaveSignatureRegistry } from './stavesignatureregistry';

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
export class Part {
  private config: Config;
  private id: string;
  private systemId: symbol;
  private measures: Measure[];
  private staveCount: number;
  private noopMeasureCount: number;

  private constructor(opts: {
    config: Config;
    id: string;
    systemId: symbol;
    measures: Measure[];
    staveCount: number;
    noopMeasureCount: number;
  }) {
    this.config = opts.config;
    this.id = opts.id;
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
    previousPart: Part | null;
    staveLayouts: musicxml.StaveLayout[];
  }): Part {
    const id = opts.musicXml.part.getId();
    const staveLayouts = opts.staveLayouts;

    const staveSignatureRegistry = StaveSignatureRegistry.from(opts.musicXml.part);
    const staveCount = util.max(
      staveSignatureRegistry.all().map((measureAttribute) => measureAttribute.getStaveCount())
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
      const staveSignatures = staveSignatureRegistry
        .all()
        .filter((staveSignature) => staveSignature.getMeasureIndex() <= measureIndex);
      const leadingStaveSignature =
        staveSignatures.find((staveSignature) => staveSignature.getMeasureIndex() === measureIndex) ??
        util.last(staveSignatures);

      const measure = Measure.create({
        // When splitting a system into smaller systems, the measure index should be maintained from when it was just
        // a single system. Therefore, this index should continue to be correct when a system is split.
        index: measureIndex,
        config: opts.config,
        musicXml: { measure: xmlMeasure },
        staveCount,
        isFirstPartMeasure: measureIndex === 0,
        isLastPartMeasure: measureIndex === xmlMeasures.length - 1,
        systemId: opts.systemId,
        previousMeasure,
        leadingStaveSignature,
        staveSignatureRegistry,
        staveLayouts,
      });

      noopMeasureCount += measure.getMultiRestCount() - 1;
      measures.push(measure);
      previousMeasure = measure;
    }

    return new Part({
      config: opts.config,
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
  slice(opts: { systemId: symbol; measureStartIndex: number; measureEndIndex: number }): Part {
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

    const measures = this.measures
      .slice(opts.measureStartIndex, opts.measureEndIndex)
      .map((measure) => measure.clone(opts.systemId));

    return new Part({
      config: this.config,
      id: this.id,
      systemId: opts.systemId,
      measures,
      staveCount: this.staveCount,
      noopMeasureCount: this.noopMeasureCount,
    });
  }

  /** Renders the part. */
  render(opts: {
    x: number;
    y: number;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    isLastSystem: boolean;
  }): PartRendering {
    const measureRenderings = new Array<MeasureRendering>();

    let x = opts.x;
    const y = opts.y;

    let vfStaveConnector: vexflow.StaveConnector | null = null;

    for (let index = 0; index < this.measures.length; index++) {
      const measure = this.measures[index];
      const previousMeasure = this.measures[index - 1] ?? null;

      const hasStaveConnectorBrace = index === 0 && this.staveCount > 1;

      if (hasStaveConnectorBrace) {
        x += STAVE_CONNECTOR_BRACE_WIDTH;
      }

      const measureRendering = measure.render({
        x,
        y,
        isLastSystem: opts.isLastSystem,
        previousMeasure,
        minRequiredSystemWidth: opts.minRequiredSystemWidth,
        targetSystemWidth: opts.targetSystemWidth,
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
    }

    return {
      id: this.id,
      vexflow: { staveConnector: vfStaveConnector },
      measures: measureRenderings,
    };
  }
}

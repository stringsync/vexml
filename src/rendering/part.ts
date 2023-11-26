import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Measure, MeasureRendering } from './measure';
import { StaveSignature } from './stavesignature';
import { Config } from './config';
import { Address } from './address';
import { Spanners2 } from './spanners2';

const STAVE_CONNECTOR_BRACE_WIDTH = 16;

/** The result of rendering a Part. */
export type PartRendering = {
  id: string;
  address: Address<'part'>;
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
  private musicXml: { part: musicxml.Part };
  private measures: Measure[];

  constructor(opts: { config: Config; musicXml: { part: musicxml.Part }; measures: Measure[] }) {
    this.config = opts.config;
    this.musicXml = opts.musicXml;
    this.measures = opts.measures;
  }

  getId(): string {
    return this.musicXml.part.getId();
  }

  getMeasures(): Measure[] {
    return this.measures;
  }

  render(opts: {
    x: number;
    y: number;
    address: Address<'part'>;
    spanners: Spanners2;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    isLastSystem: boolean;
    previousPart: Part | null;
    nextPart: Part | null;
  }): PartRendering {
    const measureRenderings = new Array<MeasureRendering>();

    let x = opts.x;
    const y = opts.y + this.getTopPadding();

    let vfStaveConnector: vexflow.StaveConnector | null = null;

    util.forEachTriple(this.measures, ([previousMeasure, currentMeasure, nextMeasure], { isFirst, isLast, index }) => {
      // Even though a system has many parts, each part spans the entire system. Therefore the measure index in the
      // Part object is the systemMeasureIndex.
      const systemMeasureIndex = index;

      if (isFirst) {
        previousMeasure = util.last(opts.previousPart?.measures ?? []);
      }
      if (isLast) {
        nextMeasure = util.first(opts.nextPart?.measures ?? []);
      }

      const hasStaveConnectorBrace = isFirst && this.getStaveCount() > 1;

      if (hasStaveConnectorBrace) {
        x += STAVE_CONNECTOR_BRACE_WIDTH;
      }

      const measureRendering = currentMeasure.render({
        x,
        y,
        address: opts.address.measure(),
        spanners: opts.spanners,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth: opts.minRequiredSystemWidth,
        targetSystemWidth: opts.targetSystemWidth,
        systemMeasureIndex,
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
      id: this.musicXml.part.getId(),
      address: opts.address,
      vexflow: { staveConnector: vfStaveConnector },
      measures: measureRenderings,
    };
  }

  @util.memoize()
  private getMeasureEntryGroups() {
    return StaveSignature.toMeasureEntryGroups({ part: this.musicXml.part });
  }

  private getTopPadding(): number {
    return util.max(this.measures.map((measure) => measure.getTopPadding()));
  }

  private getStaveCount(): number {
    return util.max(
      this.getMeasureEntryGroups()
        .flat()
        .filter((entry): entry is StaveSignature => entry instanceof StaveSignature)
        .map((entry) => entry.getStaveCount())
    );
  }
}

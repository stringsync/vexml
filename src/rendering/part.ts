import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Measure, MeasureRendering } from './measure';
import { PartRendering } from './legacypart';
import { StaveSignature } from './stavesignature';
import { Config } from './config';

const STAVE_CONNECTOR_BRACE_WIDTH = 16;

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

  getMeasures(): Measure[] {
    return this.measures;
  }

  render(opts: {
    x: number;
    y: number;
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

    util.forEachTriple(this.measures, ([previousMeasure, currentMeasure, nextMeasure], { isFirst, isLast }) => {
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
      id: this.musicXml.part.getId(),
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

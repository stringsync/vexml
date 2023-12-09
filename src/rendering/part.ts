import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Measure, MeasureRendering } from './measure';
import { StaveSignature } from './stavesignature';
import { Config } from './config';
import { Address } from './address';
import { Spanners } from './spanners';
import { PartName, PartNameRendering } from './partname';

const STAVE_CONNECTOR_BRACE_WIDTH = 16;

/** The result of rendering a Part. */
export type PartRendering = {
  id: string;
  height: number;
  address: Address<'part'>;
  vexflow: {
    staveConnector: vexflow.StaveConnector | null;
  };
  name: PartNameRendering | null;
  measures: MeasureRendering[];
};

/**
 * Represents a Part in a musical score, corresponding to the <part> element in MusicXML. This class encompasses the
 * entire musical content for a specific instrument or voice, potentially spanning multiple systems when rendered in the
 * viewport.
 */
export class Part {
  private config: Config;
  private name: PartName | null;
  private musicXml: { part: musicxml.Part };
  private measures: Measure[];

  constructor(opts: { config: Config; name: PartName | null; musicXml: { part: musicxml.Part }; measures: Measure[] }) {
    this.config = opts.config;
    this.name = opts.name;
    this.musicXml = opts.musicXml;
    this.measures = opts.measures;
  }

  getId(): string {
    return this.musicXml.part.getId();
  }

  getMeasures(): Measure[] {
    return this.measures;
  }

  getStaveOffset(): number {
    let result = 0;

    if (this.getStaveCount() > 1) {
      result += STAVE_CONNECTOR_BRACE_WIDTH;
    }
    if (this.name) {
      result += this.name.getWidth();
    }

    return result;
  }

  render(opts: {
    x: number;
    y: number;
    maxStaveOffset: number;
    showMeasureLabels: boolean;
    address: Address<'part'>;
    spanners: Spanners;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    isFirstSystem: boolean;
    isLastSystem: boolean;
    previousPart: Part | null;
    nextPart: Part | null;
  }): PartRendering {
    const measureRenderings = new Array<MeasureRendering>();

    let x = opts.x + opts.maxStaveOffset;
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

      const targetSystemWidth = opts.targetSystemWidth - opts.maxStaveOffset;

      const hasStaveConnectorBrace = isFirst && this.getStaveCount() > 1;
      if (hasStaveConnectorBrace) {
        x += STAVE_CONNECTOR_BRACE_WIDTH;
      }

      if (isFirst && this.name) {
        x += this.name.getWidth();
      }

      const measureRendering = currentMeasure.render({
        x,
        y,
        showLabel: opts.showMeasureLabels,
        address: opts.address.measure(),
        spanners: opts.spanners,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth: opts.minRequiredSystemWidth,
        targetSystemWidth,
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

    const height = util.max(
      measureRenderings
        .flatMap((measure) => measure.fragments)
        .flatMap((measureFragment) => measureFragment.staves)
        .map((stave) => stave.vexflow.stave.getBoundingBox().getH())
    );

    let name: PartNameRendering | null = null;
    const firstMeasureRendering = util.first(measureRenderings);
    if (opts.isFirstSystem && firstMeasureRendering && this.name) {
      name = this.name.render({
        x: 0,
        y: this.getMiddleY(firstMeasureRendering) + this.name.getApproximateHeight() / 2,
      });
    }

    return {
      id: this.musicXml.part.getId(),
      height,
      address: opts.address,
      vexflow: { staveConnector: vfStaveConnector },
      name,
      measures: measureRenderings,
    };
  }

  @util.memoize()
  private getMeasureEntryGroups() {
    return StaveSignature.toMeasureEntryGroups({ part: this.musicXml.part });
  }

  @util.memoize()
  private getStaveCount(): number {
    return util.max(
      this.getMeasureEntryGroups()
        .flat()
        .filter((entry): entry is StaveSignature => entry instanceof StaveSignature)
        .map((entry) => entry.getStaveCount())
    );
  }

  private getTopPadding(): number {
    return util.max(this.measures.map((measure) => measure.getTopPadding()));
  }

  private getMiddleY(measureRendering: MeasureRendering): number {
    const fragment = util.first(measureRendering.fragments);
    if (!fragment) {
      return 0;
    }

    const topStave = util.first(fragment.staves);
    const bottomStave = util.last(fragment.staves);
    if (!topStave || !bottomStave) {
      return 0;
    }

    const topY = topStave.vexflow.stave.getYForLine(0);

    const bottomLine = bottomStave.vexflow.stave.getNumLines() - 1;
    const bottomY = bottomStave.vexflow.stave.getYForLine(bottomLine);

    return (topY + bottomY) / 2;
  }
}

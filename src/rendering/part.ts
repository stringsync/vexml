import * as util from '@/util';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Stave, StaveModifier, StaveRendering } from './stave';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Config } from './config';
import { Address } from './address';
import { Spanners } from './spanners';

/** The result of rendering a part. */
export type PartRendering = {
  type: 'part';
  id: string;
  staves: StaveRendering[];
  height: number;
};

/** A part in a musical score. */
export class Part {
  private config: Config;
  private id: string;
  private musicXml: {
    staveLayouts: musicxml.StaveLayout[];
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  };
  private measureEntries: MeasureEntry[];
  private staveSignature: StaveSignature;

  constructor(opts: {
    config: Config;
    id: string;
    musicXml: {
      staveLayouts: musicxml.StaveLayout[];
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    measureEntries: MeasureEntry[];
    staveSignature: StaveSignature;
  }) {
    this.config = opts.config;
    this.id = opts.id;
    this.musicXml = opts.musicXml;
    this.measureEntries = opts.measureEntries;
    this.staveSignature = opts.staveSignature;
  }

  @util.memoize()
  getStaves(): Stave[] {
    const result = new Array<Stave>();

    const staveCount = this.staveSignature.getStaveCount();

    for (let staveIndex = 0; staveIndex < staveCount; staveIndex++) {
      const staveNumber = staveIndex + 1;

      const measureEntries = this.measureEntries.filter((entry) => {
        if (entry instanceof musicxml.Note) {
          return entry.getStaveNumber() === staveNumber;
        }
        return true;
      });

      result.push(
        new Stave({
          config: this.config,
          staveSignature: this.staveSignature,
          number: staveNumber,
          musicXml: {
            beginningBarStyle: this.musicXml.beginningBarStyle,
            endBarStyle: this.musicXml.endBarStyle,
          },
          measureEntries,
        })
      );
    }

    return result;
  }

  /** Returns the ID of the part. */
  getId(): string {
    return this.id;
  }

  /** Returns the top padding of the part. */
  getTopPadding(): number {
    return util.max(this.getStaves().map((stave) => stave.getTopPadding()));
  }

  /** Renders the part. */
  render(opts: {
    x: number;
    y: number;
    vexflow: { formatter: vexflow.Formatter };
    width: number;
    address: Address<'part'>;
    spanners: Spanners;
    staveModifiers: StaveModifier[];
    previousPart: Part | null;
    nextPart: Part | null;
  }): PartRendering {
    const staveRenderings = new Array<StaveRendering>();

    const x = opts.x;
    let y = opts.y;

    util.forEachTriple(this.getStaves(), ([previousStave, currentStave, nextStave], { isFirst, isLast }) => {
      if (isFirst) {
        previousStave = util.last(opts.previousPart?.getStaves() ?? []);
      }
      if (isLast) {
        nextStave = util.first(opts.nextPart?.getStaves() ?? []);
      }

      const staveRendering = currentStave.render({
        x,
        y,
        vexflow: { formatter: opts.vexflow.formatter },
        address: opts.address.stave({ staveNumber: currentStave.getNumber() }),
        spanners: opts.spanners,
        width: opts.width,
        modifiers: opts.staveModifiers,
        previousStave,
        nextStave,
      });

      staveRenderings.push(staveRendering);

      const staveDistance =
        this.musicXml.staveLayouts.find((staveLayout) => staveLayout.staveNumber === staveRendering.staveNumber)
          ?.staveDistance ?? this.config.DEFAULT_STAVE_DISTANCE;

      y += staveDistance;
    });

    const topStave = util.first(staveRenderings)?.vexflow.stave;
    const bottomStave = util.last(staveRenderings)?.vexflow.stave;

    const topY = topStave?.getTopLineTopY() ?? 0;
    const bottomY = bottomStave?.getBottomLineBottomY() ?? 0;
    const height = util.max([bottomY - topY, 0]);

    return {
      type: 'part',
      id: this.id,
      staves: staveRenderings,
      height,
    };
  }
}

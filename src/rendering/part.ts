import * as util from '@/util';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Stave, StaveModifier, StaveRendering } from './stave';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Config } from './config';
import { Address } from './address';
import { Spanners } from './spanners';
import { PartName, PartNameRendering } from './partname';

/** The result of rendering a part. */
export type PartRendering = {
  type: 'part';
  id: string;
  name: PartNameRendering | null;
  staves: StaveRendering[];
  height: number;
};

/** A part in a musical score. */
export class Part {
  private config: Config;
  private id: string;
  private name: PartName;
  private musicXML: {
    staveLayouts: musicxml.StaveLayout[];
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  };
  private measureEntries: MeasureEntry[];
  private staveSignature: StaveSignature;

  constructor(opts: {
    config: Config;
    id: string;
    name: PartName;
    musicXML: {
      staveLayouts: musicxml.StaveLayout[];
      beginningBarStyle: musicxml.BarStyle;
      endBarStyle: musicxml.BarStyle;
    };
    measureEntries: MeasureEntry[];
    staveSignature: StaveSignature;
  }) {
    this.config = opts.config;
    this.id = opts.id;
    this.name = opts.name;
    this.musicXML = opts.musicXML;
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
        if (entry instanceof musicxml.Direction) {
          return entry.getStaveNumber() === staveNumber;
        }
        return true;
      });

      result.push(
        new Stave({
          config: this.config,
          staveSignature: this.staveSignature,
          number: staveNumber,
          musicXML: {
            beginningBarStyle: this.musicXML.beginningBarStyle,
            endBarStyle: this.musicXML.endBarStyle,
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

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    // TODO: One stave could be a multi measure rest, while another one could have voices.
    return util.max(this.getStaves().map((stave) => stave.getMultiRestCount()));
  }

  /** Renders the part. */
  render(opts: {
    x: number;
    y: number;
    vexflow: { formatter: vexflow.Formatter };
    width: number;
    address: Address<'part'>;
    spanners: Spanners;
    beginningStaveModifiers: StaveModifier[];
    endStaveModifiers: StaveModifier[];
    previousPart: Part | null;
    nextPart: Part | null;
  }): PartRendering {
    const staveRenderings = new Array<StaveRendering>();

    const x = opts.x;
    let y = opts.y;
    const width = opts.width;

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
        width,
        beginningModifiers: opts.beginningStaveModifiers,
        endModifiers: opts.endStaveModifiers,
        previousStave,
        nextStave,
      });

      staveRenderings.push(staveRendering);

      const staveDistance =
        this.musicXML.staveLayouts.find((staveLayout) => staveLayout.staveNumber === staveRendering.staveNumber)
          ?.staveDistance ?? this.config.DEFAULT_STAVE_DISTANCE;

      y += staveDistance;
    });

    const topStave = util.first(staveRenderings)?.vexflow.stave;
    const bottomStave = util.last(staveRenderings)?.vexflow.stave;

    const topY = topStave?.getTopLineTopY() ?? 0;
    const bottomY = bottomStave?.getBottomLineBottomY() ?? 0;
    const middleY = (topY + bottomY) / 2;
    const height = util.max([bottomY - topY, 0]);

    const isFirstSystem = opts.address.getSystemIndex() === 0;
    const isFirstMeasure = opts.address.getMeasureIndex() === 0;
    const isFirstMeasureFragment = opts.address.getMeasureFragmentIndex() === 0;

    let name: PartNameRendering | null = null;
    if (isFirstSystem && isFirstMeasure && isFirstMeasureFragment) {
      name = this.name.render({ x: 0, y: middleY + this.name.getApproximateHeight() / 2 });
    }

    if (this.hasSegno()) {
      topStave?.setRepetitionType(vexflow.Repetition.type.SEGNO_LEFT);
    }

    if (this.hasCoda()) {
      topStave?.setRepetitionType(vexflow.Repetition.type.CODA_LEFT);
    }

    return {
      type: 'part',
      id: this.id,
      name,
      staves: staveRenderings,
      height,
    };
  }

  private hasSegno(): boolean {
    return (
      this.measureEntries
        .filter((entry): entry is musicxml.Direction => entry instanceof musicxml.Direction)
        .flatMap((direction) => direction.getTypes())
        .flatMap((directionType) => directionType.getContent())
        .filter((content) => content.type === 'segno').length > 0
    );
  }

  private hasCoda(): boolean {
    return (
      this.measureEntries
        .filter((entry): entry is musicxml.Direction => entry instanceof musicxml.Direction)
        .flatMap((direction) => direction.getTypes())
        .flatMap((directionType) => directionType.getContent())
        .filter((content) => content.type === 'coda').length > 0
    );
  }
}

import * as vexflow from 'vexflow';
import { Factory } from './factory';
import { SystemLayout } from './types';

const DEFAULT_PADDING_FACTOR = 1.5;
const DEFAULT_LEFT_MARGIN = 0;
const DEFAULT_SYSTEM_DISTANCE = 50;

export type LineOptions = {
  systemLayout: SystemLayout | null;
  paddingFactor: number;
};

/** The outcomes of proposing a new system to the line. */
export type ProposalOutcome = AcceptedProposalOutcome | NewlineProposalOutcome | ImpossibleProposalOutcome;

type AcceptedProposalOutcome = {
  type: 'accepted';
  system: vexflow.System;
};

type NewlineProposalOutcome = {
  type: 'newline';
  system: vexflow.System;
};

type ImpossibleProposalOutcome = {
  type: 'impossible';
  explanation: string;
};

/**
 * Line represents a group of VexFlow systems that occupy the same horizontal space.
 *
 * It encapsulates the logic for determining if a new system should be added to the existing line or if a new one should
 * be created. In the latter case, we need to evenly redistribute the remaining empty space to occupy the entire SVG
 * width.
 *
 * The proposal design was used to make caller explicitly aware of line changes.
 */
export class Line {
  /** Creates a new line from a factory. */
  static create(factory: Factory, opts: Partial<LineOptions> = {}): Line {
    return new Line({
      factory,
      systems: [],
      systemLayout: opts.systemLayout ?? null,
      paddingFactor: opts.paddingFactor ?? DEFAULT_PADDING_FACTOR,
    });
  }

  private factory: Factory;
  private systemLayout: SystemLayout | null;
  private systems: vexflow.System[];
  private paddingFactor: number;

  private constructor(opts: {
    factory: Factory;
    systemLayout: SystemLayout | null;
    systems: vexflow.System[];
    paddingFactor: number;
  }) {
    this.factory = opts.factory;
    this.systemLayout = opts.systemLayout;
    this.systems = opts.systems;
    this.paddingFactor = opts.paddingFactor;
  }

  /** Proposes a system to be added to the line. */
  propose(system: vexflow.System): ProposalOutcome {
    const systemWidth = this.getSystemWidth(system);
    const rendererWidth = this.factory.getRendererWidth();
    const totalWidth = this.getTotalWidth();

    if (systemWidth > rendererWidth) {
      return {
        type: 'impossible',
        explanation: `proposed system width (${systemWidth}px) exceeds renderer width (${rendererWidth}px)`,
      };
    } else if (totalWidth + systemWidth > rendererWidth) {
      return {
        type: 'newline',
        system,
      };
    } else {
      return {
        type: 'accepted',
        system,
      };
    }
  }

  /** Accepts the outcome by adding the proposal to this line. */
  accept(outcome: AcceptedProposalOutcome): void {
    const system = outcome.system;
    const width = this.getPaddedSystemWidth(system);
    this.resize(system, width);
    this.systems.push(outcome.system);
  }

  /** Stretches systems to fill the renderer width and returns a new line. */
  newline(outcome: NewlineProposalOutcome): Line {
    const rendererWidth = this.factory.getRendererWidth();
    const totalWidth = this.getTotalWidth();
    const remainingWidth = rendererWidth - totalWidth;

    let truncatedWidth = 0;
    for (let ndx = 0; ndx < this.systems.length; ndx++) {
      const system = this.systems[ndx];
      if (this.hasFixedWidth(system)) {
        continue;
      }

      const systemWidth = this.getSystemWidth(system);

      // We want to increase the widths proportionally to what they were pre-fit.
      const systemProportion = systemWidth / totalWidth;

      // We can't use a fraction of pixels, which makes this an approximation.
      const approxWidth = systemWidth + remainingWidth * systemProportion;

      const isLastSystem = ndx === this.systems.length - 1;
      if (isLastSystem) {
        this.resize(system, Math.round(approxWidth + truncatedWidth));
      } else {
        this.resize(system, Math.trunc(approxWidth));
        truncatedWidth += approxWidth % 1;
      }
    }

    const proposedSystem = outcome.system;

    // Shift the next system to a new line and copy the current clef and time signature.
    const lastSystem = this.getLastSystem();
    if (lastSystem) {
      const leftMargin = this.systemLayout?.leftMargin ?? DEFAULT_LEFT_MARGIN;
      proposedSystem.setX(leftMargin);

      const systemDistance = this.systemLayout?.systemDistance ?? DEFAULT_SYSTEM_DISTANCE;
      proposedSystem.setY(lastSystem.getY() + lastSystem.getBoundingBox()!.getH() + systemDistance);
    }

    return new Line({
      factory: this.factory,
      systemLayout: this.systemLayout,
      systems: [proposedSystem],
      paddingFactor: this.paddingFactor,
    });
  }

  private getLastSystem(): vexflow.System | null {
    return this.systems[this.systems.length - 1] ?? null;
  }

  private getPaddedSystemWidth(system: vexflow.System): number {
    const formatter = this.factory.Formatter();
    const voices = system.getVoices();
    formatter.joinVoices(voices);

    const requiredSystemWidth = formatter.preCalculateMinTotalWidth(voices);
    const noteStartX = Math.max(0, ...system.getStaves().map((stave) => stave.getNoteStartX()));

    return requiredSystemWidth * this.paddingFactor + vexflow.Stave.defaultPadding + noteStartX - system.getX();
  }

  private getSystemWidth(system: vexflow.System): number {
    const box = system.getBoundingBox();
    if (box) {
      return box.getW();
    }

    const width = this.getSystemOptions(system).width;
    if (typeof width === 'number') {
      return width;
    }

    return this.getPaddedSystemWidth(system);
  }

  private getTotalWidth(): number {
    let width = 0;
    for (const system of this.systems) {
      width += this.getSystemWidth(system);
    }
    return width;
  }

  private resize(system: vexflow.System, width: number): void {
    system.setOptions({
      x: system.getX(),
      y: system.getY(),
      width,
      factory: this.factory,
    });

    for (const stave of system.getStaves()) {
      stave.setWidth(width);
    }
  }

  private getSystemOptions(system: vexflow.System): vexflow.SystemOptions {
    const opts = system['options'];
    if (!opts) {
      throw new Error(`expected options to be defined on vexflow.System, check implementation in VexFlow`);
    }
    return opts;
  }

  private hasFixedWidth(system: vexflow.System) {
    const opts = this.getSystemOptions(system);
    return !opts.autoWidth && typeof opts.width === 'number';
  }
}

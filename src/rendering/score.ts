import * as util from '@/util';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System } from './system';
import {
  CurveKey,
  CurveRender,
  ScoreRender,
  SystemKey,
  SystemRender,
  TitleRender,
  WedgeRender,
  WedgeKey,
  PedalRender,
  PedalKey,
  OctaveShiftRender,
  OctaveShiftKey,
  VibratoRender,
  VibratoKey,
} from './types';
import { Label } from './label';
import { Rect } from '@/spatial';
import { Pen } from './pen';
import { SystemRenderMover } from './systemrendermover';
import { Curve } from './curve';
import { Wedge } from './wedge';
import { Pedal } from './pedal';
import { OctaveShift } from './octaveshift';
import { NoteRenderRegistry } from './noterenderregistry';
import { Vibrato } from './vibrato';

/**
 * Score is the top-level rendering object that is directly responsible for arranging systems.
 */
export class Score {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  render(): ScoreRender {
    const pen = new Pen();

    pen.moveBy({ dy: this.config.SCORE_PADDING_TOP });

    const titleRender = this.renderTitle(pen);
    const systemRenders = this.renderSystems(pen);

    const registry = NoteRenderRegistry.create(systemRenders);

    const curveRenders = this.renderCurves(registry);
    const wedgeRenders = this.renderWedges(registry);
    const pedalRenders = this.renderPedals(registry);
    const octaveShiftRenders = this.renderOctaveShifts(registry);
    const vibratoRenders = this.renderVibratos(registry);

    pen.moveBy({ dy: this.config.SCORE_PADDING_BOTTOM });

    const width = this.config.WIDTH ?? util.max(systemRenders.map((system) => system.rect.w));
    const rect = new Rect(0, 0, width, pen.position().y);

    return {
      type: 'score',
      rect,
      titleRender,
      systemRenders,
      curveRenders,
      wedgeRenders,
      pedalRenders,
      octaveShiftRenders,
      vibratoRenders,
    };
  }

  private renderTitle(pen: Pen): TitleRender | null {
    const title = this.document.getTitle();
    if (!title) {
      return null;
    }

    const position = pen.position();
    const padding = this.getTitlePadding();
    const font = this.getTitleFont();

    let label: Label;
    if (this.config.WIDTH) {
      label = Label.centerAligned(this.config, this.log, this.config.WIDTH, title, position, padding, font);
    } else {
      label = Label.singleLine(this.config, this.log, title, position, padding, font);
    }

    const rect = label.rect;
    pen.moveBy({ dy: rect.h });

    return {
      type: 'title',
      rect,
      label,
    };
  }

  private renderCurves(registry: NoteRenderRegistry): CurveRender[] {
    const curves = this.document.getCurves();
    const curveRenders = new Array<CurveRender>();

    for (let curveIndex = 0; curveIndex < curves.length; curveIndex++) {
      const key: CurveKey = { curveIndex };

      const noteRenderCount = registry.get(curves[curveIndex].id)?.length ?? 0;

      if (noteRenderCount >= 1) {
        const curveRender = new Curve(this.config, this.log, this.document, key, registry).render();
        curveRenders.push(curveRender);
      }
    }

    return curveRenders;
  }

  private renderWedges(registry: NoteRenderRegistry): WedgeRender[] {
    const wedges = this.document.getWedges();
    const wedgeRenders = new Array<WedgeRender>();

    for (let wedgeIndex = 0; wedgeIndex < wedges.length; wedgeIndex++) {
      const key: WedgeKey = { wedgeIndex };

      const noteRenderCount = registry.get(wedges[wedgeIndex].id)?.length ?? 0;

      if (noteRenderCount >= 1) {
        const wedgeRender = new Wedge(this.config, this.log, this.document, key, registry).render();
        wedgeRenders.push(wedgeRender);
      }
    }

    return wedgeRenders;
  }

  private renderPedals(registry: NoteRenderRegistry): PedalRender[] {
    const pedals = this.document.getPedals();
    const pedalRenders = new Array<PedalRender>();

    for (let pedalIndex = 0; pedalIndex < pedals.length; pedalIndex++) {
      const key: PedalKey = { pedalIndex };

      const noteRenderCount = registry.get(pedals[pedalIndex].id)?.length ?? 0;

      if (noteRenderCount >= 1) {
        const pedalRender = new Pedal(this.config, this.log, this.document, key, registry).render();
        pedalRenders.push(pedalRender);
      }
    }

    return pedalRenders;
  }

  private renderOctaveShifts(registry: NoteRenderRegistry): OctaveShiftRender[] {
    const octaveShifts = this.document.getOctaveShifts();
    const octaveShiftRenders = new Array<OctaveShiftRender>();

    for (let octaveShiftIndex = 0; octaveShiftIndex < octaveShifts.length; octaveShiftIndex++) {
      const key: OctaveShiftKey = { octaveShiftIndex };

      const noteRenderCount = registry.get(octaveShifts[octaveShiftIndex].id)?.length ?? 0;

      if (noteRenderCount >= 1) {
        const octaveShiftRender = new OctaveShift(this.config, this.log, this.document, key, registry).render();
        octaveShiftRenders.push(octaveShiftRender);
      }
    }

    return octaveShiftRenders;
  }

  private renderVibratos(registry: NoteRenderRegistry): VibratoRender[] {
    const vibratos = this.document.getVibratos();
    const vibratoRenders = new Array<VibratoRender>();

    for (let vibratoIndex = 0; vibratoIndex < vibratos.length; vibratoIndex++) {
      const key: VibratoKey = { vibratoIndex };

      const noteRenderCount = registry.get(vibratos[vibratoIndex].id)?.length ?? 0;

      if (noteRenderCount >= 1) {
        const vibratoRender = new Vibrato(this.config, this.log, this.document, key, registry).render();
        vibratoRenders.push(vibratoRender);
      }
    }

    return vibratoRenders;
  }

  private getTitlePadding() {
    return { bottom: this.config.TITLE_PADDING_BOTTOM };
  }

  private getTitleFont() {
    return {
      color: 'black',
      family: this.config.TITLE_FONT_FAMILY,
      size: this.config.TITLE_FONT_SIZE,
      lineHeight: this.config.TITLE_FONT_LINE_HEIGHT_PX,
    };
  }

  private renderSystems(pen: Pen): SystemRender[] {
    const systemRenders = new Array<SystemRender>();

    const systemCount = this.document.getSystemCount();

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const key: SystemKey = { systemIndex };

      const systemRender = new System(this.config, this.log, this.document, key, pen.position()).render();
      systemRenders.push(systemRender);

      const excessHeight = util.max(
        systemRender.measureRenders.flatMap((m) => m.fragmentRenders).flatMap((e) => e.excessHeight)
      );
      new SystemRenderMover().moveBy(systemRender, excessHeight);

      pen.moveTo(systemRender.rect.bottomLeft());
      pen.moveBy({ dy: this.config.SYSTEM_MARGIN_BOTTOM });
    }

    return systemRenders;
  }
}

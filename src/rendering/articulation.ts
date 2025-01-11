import * as vexflow from 'vexflow';
import { Config } from './config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { ArticulationKey, ArticulationRender } from './types';

export class Articulation {
  constructor(private config: Config, private log: Logger, private document: Document, private key: ArticulationKey) {}

  render(): ArticulationRender {
    const vexflowModifiers = this.renderVexflowModifiers();

    const articulation = this.document.getArticulation(this.key);

    let position: vexflow.ModifierPosition;
    switch (articulation.placement) {
      case 'above':
        position = vexflow.Modifier.Position.ABOVE;
        break;
      case 'below':
        position = vexflow.Modifier.Position.BELOW;
        break;
      default:
        position = vexflow.Modifier.Position.ABOVE;
    }

    for (const vexflowModifier of vexflowModifiers) {
      vexflowModifier.setPosition(position);
    }

    return {
      type: 'articulation',
      rect: Rect.empty(),
      vexflowModifiers,
    };
  }

  private renderVexflowModifiers(): vexflow.Modifier[] {
    const articulation = this.document.getArticulation(this.key);

    switch (articulation.articulationType) {
      case 'upright-normal-fermata':
        return [new vexflow.Articulation('a@a')];
      case 'upright-angled-fermata':
        return [new vexflow.Articulation('a@s')];
      case 'upright-square-fermata':
        return [new vexflow.Articulation('a@l')];
      default:
        this.log.warn(`unsupported articulation type`, { type: articulation.articulationType });
        return [];
    }
  }
}

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
      case 'inverted-normal-fermata':
        return [new vexflow.Articulation('a@u')];
      case 'inverted-angled-fermata':
        return [new vexflow.Articulation('a@v')];
      case 'inverted-square-fermata':
        return [new vexflow.Articulation('a@r')];
      case 'up-bow':
        return [new vexflow.Articulation('a|')];
      case 'down-bow':
        return [new vexflow.Articulation('am')];
      case 'harmonic':
        return [new vexflow.Articulation('ah')];
      case 'open-string':
        return [new vexflow.Articulation('ah')];
      case 'double-tongue':
        return [new vexflow.Articulation('..')];
      case 'triple-tongue':
        return [new vexflow.Articulation('...')];
      case 'stopped':
        return [new vexflow.Articulation('a+')];
      case 'snap-pizzicato':
        return [new vexflow.Articulation('ao')];
      case 'tap':
        return [new vexflow.Annotation('T')];
      case 'heel':
        return [new vexflow.Annotation('U')];
      case 'toe':
        return [new vexflow.Annotation('^')];
      case 'accent':
        return articulation.placement === 'above' ? [new vexflow.Articulation('a>')] : [new vexflow.Articulation('a-')];
      case 'strong-accent':
        return [new vexflow.Articulation('a^')];
      case 'staccato':
        return [new vexflow.Articulation('a.')];
      case 'tenuto':
        return [new vexflow.Articulation('a-')];
      case 'detached-legato':
        return [new vexflow.Articulation('a.'), new vexflow.Articulation('a-')];
      case 'staccatissimo':
        return [new vexflow.Articulation('av')];
      case 'scoop':
        return [new vexflow.Ornament('scoop')];
      case 'doit':
        return [new vexflow.Ornament('doit')];
      case 'falloff':
        return [new vexflow.Ornament('fall')];
      case 'breath-mark':
        return articulation.placement === 'above' ? [new vexflow.Articulation('a>')] : [new vexflow.Articulation('a-')];
      default:
        this.log.warn(`unsupported articulation type`, { type: articulation.articulationType });
        return [];
    }
  }
}

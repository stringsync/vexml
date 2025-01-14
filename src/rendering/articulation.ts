import * as vexflow from 'vexflow';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { ArticulationKey, ArticulationRender } from './types';

export class Articulation {
  constructor(private config: Config, private log: Logger, private document: Document, private key: ArticulationKey) {}

  render(): ArticulationRender {
    const vexflowModifiers = this.renderVexflowModifiers();

    return {
      type: 'articulation',
      key: this.key,
      rect: Rect.empty(),
      vexflowModifiers,
    };
  }

  private renderVexflowModifiers(): vexflow.Modifier[] {
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

    function vexflowArticulation(type: string, position?: vexflow.ModifierPosition) {
      const a = new vexflow.Articulation(type);
      if (position) {
        a.setPosition(position);
      }
      return a;
    }

    function vexflowAnnotation(text: string, position?: vexflow.ModifierPosition) {
      const a = new vexflow.Annotation(text);
      if (position) {
        a.setPosition(position);
      }
      return a;
    }

    function vexflowOrnament(type: string, position?: vexflow.ModifierPosition) {
      const o = new vexflow.Ornament(type);
      if (position) {
        o.setPosition(position);
      }
      return o;
    }

    switch (articulation.articulationType) {
      case 'upright-normal-fermata':
        return [vexflowArticulation('a@a', position)];
      case 'upright-angled-fermata':
        return [vexflowArticulation('a@s', position)];
      case 'upright-square-fermata':
        return [vexflowArticulation('a@l', position)];
      case 'inverted-normal-fermata':
        return [vexflowArticulation('a@u', position)];
      case 'inverted-angled-fermata':
        return [vexflowArticulation('a@v', position)];
      case 'inverted-square-fermata':
        return [vexflowArticulation('a@r', position)];
      case 'upstroke':
        return [vexflowArticulation('a|', position)];
      case 'downstroke':
        return [vexflowArticulation('am', position)];
      case 'harmonic':
        return [vexflowArticulation('ah', position)];
      case 'open-string':
        return [vexflowArticulation('ah', position)];
      case 'double-tongue':
        return [vexflowArticulation('..', position)];
      case 'triple-tongue':
        return [vexflowArticulation('...', position)];
      case 'stopped':
        return [vexflowArticulation('a+', position)];
      case 'snap-pizzicato':
        return [vexflowArticulation('ao', position)];
      case 'tap':
        return [vexflowAnnotation('T', position)];
      case 'heel':
        return [vexflowAnnotation('U', position)];
      case 'toe':
        return [vexflowAnnotation('^', position)];
      case 'accent':
        return articulation.placement === 'above'
          ? [vexflowArticulation('a>', position)]
          : [vexflowArticulation('a-', position)];
      case 'strong-accent':
        return [vexflowArticulation('a^', position)];
      case 'staccato':
        return [vexflowArticulation('a.', position)];
      case 'tenuto':
        return [vexflowArticulation('a-')];
      case 'detached-legato':
        return [vexflowArticulation('a.', position), vexflowArticulation('a-', position)];
      case 'staccatissimo':
        return [vexflowArticulation('av', position)];
      case 'scoop':
        return [vexflowOrnament('scoop')];
      case 'doit':
        return [vexflowOrnament('doit')];
      case 'falloff':
        return [vexflowOrnament('fall')];
      case 'breath-mark':
        return articulation.placement === 'above'
          ? [vexflowArticulation('a>', position)]
          : [vexflowArticulation('a-', position)];
      case 'arpeggio-roll-up':
        return [new vexflow.Stroke(vexflow.Stroke.Type.ROLL_UP)];
      case 'arpeggio-roll-down':
        return [new vexflow.Stroke(vexflow.Stroke.Type.ROLL_DOWN)];
      case 'arpeggio-directionless':
        return [new vexflow.Stroke(vexflow.Stroke.Type.ARPEGGIO_DIRECTIONLESS)];
      case 'trill-mark':
        return [vexflowOrnament('tr', position)];
      case 'mordent':
        return [vexflowOrnament('mordent')];
      case 'inverted-mordent':
        return [vexflowOrnament('mordentInverted')];
    }
  }
}

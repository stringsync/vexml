import * as data from '@/data';
import * as vexflow from 'vexflow';
import { Config } from '@/config';
import { Logger } from '@/debug';
import { Rect } from '@/spatial';
import { Document } from './document';
import { BendRender, VoiceEntryKey } from './types';
import { Fraction } from '@/util';

const BEND_WIDTH = 32;

export class Bend {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}

  render(): BendRender {
    const voiceEntry = this.document.getVoiceEntry(this.key);

    const phrases = new Array<vexflow.BendPhrase>();
    if (voiceEntry.type === 'note' || voiceEntry.type === 'chord') {
      phrases.push(...voiceEntry.bends.map((bend) => this.toVexflowBendPhrase(bend)));
    }

    const vexflowModifiers = new Array<vexflow.Modifier>();
    if (phrases.length > 0) {
      vexflowModifiers.push(new vexflow.Bend(phrases));
    }

    return {
      type: 'bend',
      key: this.key,
      rect: Rect.empty(),
      vexflowModifiers,
    };
  }

  private toVexflowBendPhrase(bend: data.Bend): vexflow.BendPhrase {
    const bendType = bend.bendType;
    const semitones = bend.semitones;

    let text = '';
    if (semitones === 2) {
      text = 'full';
    } else if (semitones === 1) {
      text = '1/2';
    } else if (semitones === 0.5) {
      text = '1/4';
    } else {
      const { whole, remainder } = Fraction.fromDecimal(semitones).toMixed();
      if (whole > 0 && remainder.numerator > 0) {
        text = `${whole} ${remainder.numerator}/${remainder.denominator}`;
      } else if (whole > 0) {
        text = `${whole}`;
      } else if (remainder.numerator > 0) {
        text = `${remainder.numerator}/${remainder.denominator}`;
      }
    }

    let type: number;
    switch (bendType) {
      case 'prebend':
        // TODO: Support pre-bends when they are supported by VexFlow.
        type = vexflow.Bend.UP;
        break;
      case 'release':
        type = vexflow.Bend.DOWN;
        break;
      default:
        type = vexflow.Bend.UP;
        break;
    }

    return { text, type, width: BEND_WIDTH, drawWidth: BEND_WIDTH };
  }
}

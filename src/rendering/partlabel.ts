import * as elements from '@/elements';
import * as spatial from '@/spatial';
import * as drawing from '@/drawing';
import { Logger } from '@/debug';
import { Config } from './config';
import { Document } from './document';
import { TextMeasurer } from './textmeasurer';
import { PartLabelKey } from './types';

export class PartLabel {
  constructor(private config: Config, private log: Logger, private document: Document, private key: PartLabelKey) {}

  render(x: number, y: number): elements.PartLabel {
    const label = this.document.getPartLabel(this.key);
    const fontSize = this.config.PART_LABEL_FONT_FAMILY;
    const fontFamily = this.config.PART_LABEL_FONT_SIZE;

    const text = new drawing.Text({ content: label, x, y, color: 'black' });

    const textMeasurer = new TextMeasurer({ text: label, fontSize, fontFamily });
    const w = textMeasurer.getWidth();
    const h = textMeasurer.getApproximateHeight();
    const rect = new spatial.Rect(x, y, w, h);

    return new elements.PartLabel(rect, text, label);
  }
}

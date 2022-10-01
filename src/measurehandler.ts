import { NodeHandler } from './nodehandler';
import { VexmlMessageReceiver } from './types';

const DEFAULT_MEASURE_WIDTH_PX = 100;
const DEFAULT_NUM_STAVES = 0;

/**
 * Produces vexml messages from <measure> nodes.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/
 */
export class MeasureHandler extends NodeHandler<'measure'> {
  message(receiver: VexmlMessageReceiver): void {
    this.messageStart(receiver);
    this.messageContent(receiver);
    this.messageEnd(receiver);
  }

  private messageStart(receiver: VexmlMessageReceiver): void {
    receiver.onMessage({
      msgType: 'measureStart',
      width: this.getWidth(),
      staves: this.getStaves(),
    });
  }

  private messageContent(receiver: VexmlMessageReceiver): void {
    // noop
  }

  private messageEnd(receiver: VexmlMessageReceiver): void {
    receiver.onMessage({ msgType: 'measureEnd' });
  }

  private getWidth(): number {
    const width = this.node.asElement().getAttribute('width');
    if (width) {
      return parseInt(width, 10);
    } else {
      return DEFAULT_MEASURE_WIDTH_PX;
    }
  }

  private getStaves(): number {
    const staves = this.node.asElement().getElementsByTagName('staves').item(0)?.textContent;
    if (staves) {
      return parseInt(staves, 10);
    } else {
      return DEFAULT_NUM_STAVES;
    }
  }
}

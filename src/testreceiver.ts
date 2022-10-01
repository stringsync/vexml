import { VexmlMessage, VexmlMessageReceiver } from './types';

export class TestReceiver implements VexmlMessageReceiver {
  public readonly messages = new Array<VexmlMessage>();

  onMessage(message: VexmlMessage): void {
    this.messages.push(message);
  }
}

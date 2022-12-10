import { VexmlMessage, VexmlMessageReceiver } from '../types';

export class MultiReceiver implements VexmlMessageReceiver {
  static of(...receivers: VexmlMessageReceiver[]): MultiReceiver {
    return new MultiReceiver(receivers);
  }

  private constructor(private receivers: VexmlMessageReceiver[]) {}

  onMessage(message: VexmlMessage): void {
    for (const receiver of this.receivers) {
      receiver.onMessage(message);
    }
  }
}

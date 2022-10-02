import { VexmlMessageReceiver } from './types';

export class NoopReceiver implements VexmlMessageReceiver {
  onMessage(): void {
    // noop
  }
}

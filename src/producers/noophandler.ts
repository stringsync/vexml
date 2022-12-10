import { NodeHandler } from './nodehandler';

export class NoopHandler implements NodeHandler<string> {
  sendMessages(): void {
    // noop
  }
}

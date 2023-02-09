import { NoopReceiver } from '../receivers/noopreceiver';
import * as xml from '../util/xml';
import { NoopHandler } from './noophandler';
import { Producer } from './producer';

describe('Producer', () => {
  describe('feed', () => {
    it('runs without crashing', () => {
      expect(() => Producer.feed('')).not.toThrow();
    });

    it('creates a Producer instance', () => {
      const producer = Producer.feed('');
      expect(producer).toBeInstanceOf(Producer);
    });
  });
});

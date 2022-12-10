import { NoopReceiver } from '../receivers/noopreceiver';
import * as xml from '../xml';
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

  describe('sendMessages', () => {
    let partHandler: NoopHandler;
    let receiver: NoopReceiver;

    let partHandlerSpy: jest.SpyInstance;

    beforeEach(() => {
      partHandler = new NoopHandler();
      receiver = new NoopReceiver();

      partHandlerSpy = jest.spyOn(partHandler, 'sendMessages');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('handles part nodes', () => {
      const parts = [xml.part(), xml.part()];
      const musicXml = xml.scorePartwise({ parts }).asElement().outerHTML;
      const producer = new Producer(musicXml, { partHandler });

      producer.sendMessages(receiver);

      expect(partHandlerSpy).toHaveBeenCalledTimes(2);
    });

    it('ignores non-part nodes', () => {
      const scorePartwise = xml.createElement('score-partwise');
      scorePartwise.append(xml.createElement('foo'));
      const musicXml = scorePartwise.outerHTML;
      const producer = new Producer(musicXml, { partHandler });

      expect(() => producer.sendMessages(receiver)).not.toThrow();
      expect(partHandlerSpy).not.toHaveBeenCalled();
    });
  });
});

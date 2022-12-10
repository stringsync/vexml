import { DEFAULT_CONFIG } from '../di';
import * as msg from '../msg';
import { NoopReceiver } from '../receivers/noopreceiver';
import { AttributesMessage } from '../types';
import * as xml from '../xml';
import { AttributesHandler } from './attributeshandler';

describe(AttributesHandler, () => {
  let receiver: NoopReceiver;
  let attributesHandler: AttributesHandler;

  let receiverSpy: jest.SpyInstance;

  beforeEach(() => {
    receiver = new NoopReceiver();
    attributesHandler = new AttributesHandler({ config: DEFAULT_CONFIG });

    receiverSpy = jest.spyOn(receiver, 'onMessage');
  });

  it('sends an attributes message with clefs', () => {
    const attributes = xml.attributes({
      clefs: [xml.clef({ staff: 1 }), xml.clef({ staff: 2 })],
    });

    attributesHandler.sendMessages(receiver, { node: attributes });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[AttributesMessage]>(
      msg.attributes({
        clefs: [
          { staff: 1, sign: 'G', line: 2, octaveChange: undefined },
          { staff: 2, sign: 'G', line: 2, octaveChange: undefined },
        ],
      })
    );
  });

  it('sends an attributes message with times', () => {
    const attributes = xml.attributes({
      times: [
        xml.time({
          times: [{ beats: xml.beats({ beats: '4' }), beatType: xml.beatType({ beatType: '4' }) }],
        }),
      ],
    });

    attributesHandler.sendMessages(receiver, { node: attributes });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[AttributesMessage]>(
      msg.attributes({
        times: [{ signature: '4/4' }],
      })
    );
  });

  it('sends an attributes message with keys', () => {
    const attributes = xml.attributes({
      keys: [xml.key({ fifths: xml.fifths({ fifths: 2 }) }), xml.key({ fifths: xml.fifths({ fifths: 0 }) })],
    });

    attributesHandler.sendMessages(receiver, { node: attributes });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[AttributesMessage]>(
      msg.attributes({
        keys: [
          { fifths: 2, staff: undefined },
          { fifths: 0, staff: undefined },
        ],
      })
    );
  });
});

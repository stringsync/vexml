import { DEFAULT_CONFIG } from '../di';
import { NoopReceiver } from '../receivers/noopreceiver';
import { ClefMessage, KeyMessage, LegacyAttributesMessage, TimeMessage } from '../types';
import * as msg from '../util/msg';
import * as xml from '../util/xml';
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

    expect(receiverSpy).toHaveBeenCalledTimes(3);
    expect(receiverSpy).toHaveBeenNthCalledWith<[ClefMessage]>(
      1,
      msg.clef({ staff: 1, sign: 'G', line: 2, octaveChange: null })
    );
    expect(receiverSpy).toHaveBeenNthCalledWith<[ClefMessage]>(
      2,
      msg.clef({ staff: 2, sign: 'G', line: 2, octaveChange: null })
    );
    expect(receiverSpy).toHaveBeenNthCalledWith<[LegacyAttributesMessage]>(
      3,
      msg.legacyAttributes({
        clefs: [
          msg.clef({ staff: 1, sign: 'G', line: 2, octaveChange: null }),
          msg.clef({ staff: 2, sign: 'G', line: 2, octaveChange: null }),
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

    expect(receiverSpy).toHaveBeenCalledTimes(2);
    expect(receiverSpy).toHaveBeenNthCalledWith<[TimeMessage]>(1, msg.time({ beats: '4', beatType: '4', staff: null }));
    expect(receiverSpy).toHaveBeenNthCalledWith<[LegacyAttributesMessage]>(
      2,
      msg.legacyAttributes({ times: [msg.time({ beats: '4', beatType: '4', staff: null })] })
    );
  });

  it('sends an attributes message with keys', () => {
    const attributes = xml.attributes({
      keys: [xml.key({ fifths: xml.fifths({ fifths: 2 }) }), xml.key({ fifths: xml.fifths({ fifths: 0 }) })],
    });

    attributesHandler.sendMessages(receiver, { node: attributes });

    expect(receiverSpy).toHaveBeenCalledTimes(3);
    expect(receiverSpy).toHaveBeenNthCalledWith<[KeyMessage]>(1, msg.key({ fifths: 2, staff: null }));
    expect(receiverSpy).toHaveBeenNthCalledWith<[KeyMessage]>(2, msg.key({ fifths: 0, staff: null }));
    expect(receiverSpy).toHaveBeenNthCalledWith<[LegacyAttributesMessage]>(
      3,
      msg.legacyAttributes({ keys: [msg.key({ fifths: 2, staff: null }), msg.key({ fifths: 0, staff: null })] })
    );
  });
});

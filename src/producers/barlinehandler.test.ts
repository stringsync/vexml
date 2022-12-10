import * as msg from '../msg';
import { NoopReceiver } from '../noopreceiver';
import { BarlineMessage } from '../types';
import * as xml from '../xml';
import { BarlineHandler } from './barlinehandler';

describe('BarlineHandler', () => {
  let barlineHandler: BarlineHandler;
  let receiver: NoopReceiver;

  let receiverSpy: jest.SpyInstance;

  beforeEach(() => {
    barlineHandler = new BarlineHandler();
    receiver = new NoopReceiver();

    receiverSpy = jest.spyOn(receiver, 'onMessage');
  });

  it('sends barline messages', () => {
    const barline = xml.barline({
      location: 'right',
      barStyle: xml.barStyle({ textContent: 'dashed' }),
      repeat: xml.repeat({ direction: 'backward' }),
      ending: xml.ending({
        number: '1',
        type: 'start',
        textContent: 'ending',
      }),
    });

    barlineHandler.sendMessages(receiver, { node: barline });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenCalledWith<[BarlineMessage]>(
      msg.barline({
        barStyle: 'dashed',
        ending: { number: '1', type: 'start', text: 'ending' },
        location: 'right',
        repeatDirection: 'backward',
      })
    );
  });

  it('sends barline messages with defaults', () => {
    const barline = xml.barline();
    barlineHandler.sendMessages(receiver, { node: barline });
    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenCalledWith<[BarlineMessage]>(
      msg.barline({
        barStyle: null,
        ending: null,
        location: 'right',
        repeatDirection: null,
      })
    );
  });
});

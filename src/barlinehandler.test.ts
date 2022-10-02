import { BarlineHandler } from './barlinehandler';
import * as msg from './msg';
import { NoopReceiver } from './noopreceiver';
import { BarlineMessage } from './types';
import * as xml from './xml';

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
    const barStyle = xml.barStyle({ textContent: 'dashed' });
    const repeat = xml.repeat({ direction: 'backward' });
    const ending = xml.ending({ number: '1', type: 'start', textContent: 'ending' });
    const barline = xml.barline({ location: 'right', barStyle, repeat, ending });

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

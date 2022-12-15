import { NoopReceiver } from '../receivers/noopreceiver';
import { DirectionMessage } from '../types';
import * as msg from '../util/msg';
import * as xml from '../util/xml';
import { DirectionHandler } from './directionhandler';

describe(DirectionHandler, () => {
  let receiver: NoopReceiver;
  let directionHandler: DirectionHandler;

  let receiverSpy: jest.SpyInstance;

  beforeEach(() => {
    receiver = new NoopReceiver();
    directionHandler = new DirectionHandler();

    receiverSpy = jest.spyOn(receiver, 'onMessage');
  });

  it('sends a direction message with coda', () => {
    const direction = xml.direction({
      codas: [xml.coda()],
    });

    directionHandler.sendMessages(receiver, { node: direction });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[DirectionMessage]>(
      msg.direction({
        codas: [{}],
      })
    );
  });

  it('sends a direction message with seno', () => {
    const direction = xml.direction({
      segnos: [xml.segno()],
    });

    directionHandler.sendMessages(receiver, { node: direction });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[DirectionMessage]>(
      msg.direction({
        segnos: [{}],
      })
    );
  });
});

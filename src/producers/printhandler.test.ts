import { NoopReceiver } from '../receivers/noopreceiver';
import { PrintMessage } from '../types';
import * as msg from '../util/msg';
import * as xml from '../util/xml';
import { PrintHandler } from './printhandler';

describe(PrintHandler, () => {
  let receiver: NoopReceiver;
  let printHandler: PrintHandler;

  let receiverSpy: jest.SpyInstance;

  beforeEach(() => {
    receiver = new NoopReceiver();
    printHandler = new PrintHandler();

    receiverSpy = jest.spyOn(receiver, 'onMessage');
  });

  it('sends a print message with new system', () => {
    const print = xml.print({
      newSystem: true,
    });

    printHandler.sendMessages(receiver, { node: print });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[PrintMessage]>(
      msg.print({
        newSystem: true,
      })
    );
  });
});

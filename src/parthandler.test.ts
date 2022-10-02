import { NoopHandler } from './noophandler';
import { NoopReceiver } from './noopreceiver';
import { PartHandler } from './parthandler';
import { PartEndMessage, PartStartMessage } from './types';
import * as xml from './xml';

describe('PartHandler', () => {
  let receiver: NoopReceiver;
  let measureHandler: NoopHandler;
  let partHandler: PartHandler;

  let onMessageSpy: jest.SpyInstance;
  let measureSendMessagesSpy: jest.SpyInstance;

  beforeEach(() => {
    receiver = new NoopReceiver();
    measureHandler = new NoopHandler();
    partHandler = new PartHandler({ measureHandler });

    onMessageSpy = jest.spyOn(receiver, 'onMessage');
    measureSendMessagesSpy = jest.spyOn(measureHandler, 'sendMessages');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a partStart message', () => {
    const part = xml.part({ id: 'foo' });

    partHandler.sendMessages(receiver, { node: part });

    expect(onMessageSpy).toHaveBeenNthCalledWith<[PartStartMessage]>(1, {
      msgType: 'partStart',
      id: 'foo',
      msgCount: 0,
      msgIndex: 0,
    });
  });

  it('sends a partStart message with a default id', () => {
    const part = xml.part();

    partHandler.sendMessages(receiver, { node: part });

    expect(onMessageSpy).toHaveBeenNthCalledWith<[PartStartMessage]>(1, {
      msgType: 'partStart',
      id: 'NN',
      msgCount: 0,
      msgIndex: 0,
    });
  });

  it('sends a partEnd message', () => {
    const part = xml.part({ id: 'foo' });

    partHandler.sendMessages(receiver, { node: part });

    expect(onMessageSpy).toHaveBeenLastCalledWith<[PartEndMessage]>({
      msgType: 'partEnd',
      id: 'foo',
      msgCount: 0,
      msgIndex: 0,
    });
  });

  it('sends a partEnd message with a default id', () => {
    const part = xml.part();

    partHandler.sendMessages(receiver, { node: part });

    expect(onMessageSpy).toHaveBeenLastCalledWith<[PartEndMessage]>({
      msgType: 'partEnd',
      id: 'NN',
      msgCount: 0,
      msgIndex: 0,
    });
  });

  it('handles measure nodes', () => {
    const measures = new Array(3).fill(null).map(xml.measure);
    const part = xml.part({ id: 'foo', measures });

    partHandler.sendMessages(receiver, { node: part });

    expect(measureSendMessagesSpy).toHaveBeenCalledTimes(3);
  });
});

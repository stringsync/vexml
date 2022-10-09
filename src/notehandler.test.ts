import * as msg from './msg';
import { NoopReceiver } from './noopreceiver';
import { NoteHandler } from './notehandler';
import { NoteMessage } from './types';
import * as xml from './xml';

describe('NoteHandler', () => {
  let receiver: NoopReceiver;
  let noteHandler: NoteHandler;

  let receiverSpy: jest.SpyInstance;

  beforeEach(() => {
    receiver = new NoopReceiver();
    noteHandler = new NoteHandler();

    receiverSpy = jest.spyOn(receiver, 'onMessage');
  });

  it('sends a note message with stem', () => {
    const note = xml.note({
      stem: xml.stem({ textContent: 'up' }),
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(msg.note({ stem: 'up' }));
  });
});

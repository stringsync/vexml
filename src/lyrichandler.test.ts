import { DEFAULT_CONFIG } from './di';
import { LyricHandler } from './lyrichandler';
import { NoopReceiver } from './noopreceiver';

describe(LyricHandler, () => {
  let receiver: NoopReceiver;
  let lyricHandler: LyricHandler;

  let receiverSpy: jest.SpyInstance;

  beforeEach(() => {
    receiver = new NoopReceiver();
    lyricHandler = new LyricHandler({ config: DEFAULT_CONFIG });

    receiverSpy = jest.spyOn(receiver, 'onMessage');
  });

  it.todo('sends a lyric message with text');

  it.todo('sends a lyric message with syllabics');
});

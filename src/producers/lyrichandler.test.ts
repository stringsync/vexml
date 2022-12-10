import { DEFAULT_CONFIG } from '../di';
import * as msg from '../msg';
import { NoopReceiver } from '../receivers/noopreceiver';
import { LyricMessage } from '../types';
import * as xml from '../xml';
import { LyricHandler } from './lyrichandler';

describe(LyricHandler, () => {
  let receiver: NoopReceiver;
  let lyricHandler: LyricHandler;

  let receiverSpy: jest.SpyInstance;

  beforeEach(() => {
    receiver = new NoopReceiver();
    lyricHandler = new LyricHandler({ config: DEFAULT_CONFIG });

    receiverSpy = jest.spyOn(receiver, 'onMessage');
  });

  it('sends a lyric message with text', () => {
    const lyric = xml.lyric({
      text: xml.text({ text: 'foo' }),
    });

    lyricHandler.sendMessages(receiver, { node: lyric });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[LyricMessage]>(msg.lyric({ text: 'foo', syllabic: 'single' }));
  });

  it('sends a lyric message with syllabics', () => {
    const lyric = xml.lyric({
      syllabic: xml.syllabic({ syllabic: 'begin' }),
    });

    lyricHandler.sendMessages(receiver, { node: lyric });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[LyricMessage]>(msg.lyric({ text: '', syllabic: 'begin' }));
  });
});

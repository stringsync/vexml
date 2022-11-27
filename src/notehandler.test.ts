import { DEFAULT_CONFIG } from './di';
import * as msg from './msg';
import { NoopHandler } from './noophandler';
import { NoopReceiver } from './noopreceiver';
import { NoteHandler } from './notehandler';
import { NoteMessage } from './types';
import * as xml from './xml';

describe('NoteHandler', () => {
  let receiver: NoopReceiver;
  let noteHandler: NoteHandler;
  let beamHandler: NoopHandler;
  let lyricHandler: NoopHandler;
  let notationsHandler: NoopHandler;

  let receiverSpy: jest.SpyInstance;

  beforeEach(() => {
    receiver = new NoopReceiver();
    beamHandler = new NoopHandler();
    lyricHandler = new NoopHandler();
    notationsHandler = new NoopHandler();
    noteHandler = new NoteHandler({ config: DEFAULT_CONFIG, beamHandler, lyricHandler, notationsHandler });

    receiverSpy = jest.spyOn(receiver, 'onMessage');
  });

  it('sends a note message with stem', () => {
    const note = xml.note({
      stem: xml.stem({ textContent: 'up' }),
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(
      msg.note({ stem: 'up', staff: 1, type: 'whole', voice: '1' })
    );
  });

  it('sends a note message with dots', () => {
    const note = xml.note({
      dots: [xml.dot(), xml.dot()],
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(
      msg.note({ dots: 2, staff: 1, type: 'whole', voice: '1' })
    );
  });

  it('sends a note message with head for rests', () => {
    const note = xml.note({
      rest: xml.rest({
        displayStep: xml.displayStep({ step: 'A' }),
        displayOctave: xml.displayOctave({ octave: '4' }),
      }),
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(
      msg.note({ head: [], staff: 1, type: 'whole', voice: '1' })
    );
  });

  it('sends a note message with head for pitches', () => {
    const note = xml.note({
      pitch: xml.pitch({
        step: xml.step({ step: 'A' }),
        octave: xml.octave({ octave: '4' }),
      }),
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(
      msg.note({
        head: [{ pitch: 'A/4', accidental: '', accidentalCautionary: false, notehead: 'normal' }],
        staff: 1,
        type: 'whole',
        voice: '1',
      })
    );
  });

  it('sends a note message with head for pitches with accidentals', () => {
    const note = xml.note({
      pitch: xml.pitch({
        step: xml.step({ step: 'A' }),
        octave: xml.octave({ octave: '4' }),
      }),
      accidental: xml.accidental({ value: 'sharp', cautionary: 'yes' }),
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(
      msg.note({
        head: [{ pitch: 'A/4', accidental: 'sharp', accidentalCautionary: true, notehead: 'normal' }],
        staff: 1,
        type: 'whole',
        voice: '1',
      })
    );
  });

  it('sends a note message with grace data', () => {
    const note = xml.note({
      grace: xml.grace({ slash: 'no' }),
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(
      msg.note({ grace: true, graceSlash: false, staff: 1, type: 'whole', voice: '1' })
    );
  });

  it('sends a note message with grace slash data', () => {
    const note = xml.note({
      grace: xml.grace({ slash: 'yes' }),
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(
      msg.note({ grace: true, graceSlash: true, staff: 1, type: 'whole', voice: '1' })
    );
  });

  it.each([1, 4, 8, 16])('sends a note message with duration: %s', (duration) => {
    const note = xml.note({
      duration: xml.duration({
        positiveDivisions: xml.positiveDivisions({ divisions: duration }),
      }),
    });

    noteHandler.sendMessages(receiver, { node: note });

    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenLastCalledWith<[NoteMessage]>(
      msg.note({ duration, staff: 1, type: 'whole', voice: '1' })
    );
  });
});

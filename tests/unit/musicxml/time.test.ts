import { Time } from '@/musicxml/time';
import { TimeSignature } from '@/musicxml/timesignature';
import { xml } from '@/util';

describe(Time, () => {
  it('returns the time signatures of the time', () => {
    const node = xml.time({
      times: [
        { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) },
        { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '8' }) },
      ],
    });
    const time = new Time(node);
    expect(time.getTimeSignatures()).toStrictEqual([new TimeSignature(3, 4), new TimeSignature(3, 8)]);
  });

  it('returns an empty array when beat and beat type elements are missing', () => {
    const node = xml.time();
    const time = new Time(node);
    expect(time.getTimeSignatures()).toBeEmpty();
  });

  it('ignores extra beats', () => {
    const node = xml.time({
      times: [
        { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) },
        { beats: xml.beats({ value: '3' }) },
      ],
    });
    const time = new Time(node);
    expect(time.getTimeSignatures()).toStrictEqual([new TimeSignature(3, 4)]);
  });

  it('ignores extra beat types', () => {
    const node = xml.time({
      times: [
        { beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '4' }) },
        { beatType: xml.beatType({ value: '6' }) },
      ],
    });
    const time = new Time(node);
    expect(time.getTimeSignatures()).toStrictEqual([new TimeSignature(3, 4)]);
  });
});

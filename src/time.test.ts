import { Time } from './time';
import * as xml from './xml';

describe(Time, () => {
  it('returns the time signatures of the time', () => {
    const node = xml.time({
      times: [
        { beats: xml.beats({ textContent: '3' }), beatType: xml.beatType({ textContent: '4' }) },
        { beats: xml.beats({ textContent: '3' }), beatType: xml.beatType({ textContent: '8' }) },
      ],
    });
    const time = new Time(node);
    expect(time.getTimeSignatures()).toStrictEqual([
      { numerator: '3', denominator: '4' },
      { numerator: '3', denominator: '8' },
    ]);
  });

  it('returns an empty array when beat and beat type elements are missing', () => {
    const node = xml.time();
    const time = new Time(node);
    expect(time.getTimeSignatures()).toBeEmpty();
  });

  it('ignores extra beats', () => {
    const node = xml.time({
      times: [
        { beats: xml.beats({ textContent: '3' }), beatType: xml.beatType({ textContent: '4' }) },
        { beats: xml.beats({ textContent: '3' }) },
      ],
    });
    const time = new Time(node);
    expect(time.getTimeSignatures()).toStrictEqual([{ numerator: '3', denominator: '4' }]);
  });

  it('ignores extra beat types', () => {
    const node = xml.time({
      times: [
        { beats: xml.beats({ textContent: '3' }), beatType: xml.beatType({ textContent: '4' }) },
        { beatType: xml.beatType({ textContent: '6' }) },
      ],
    });
    const time = new Time(node);
    expect(time.getTimeSignatures()).toStrictEqual([{ numerator: '3', denominator: '4' }]);
  });
});

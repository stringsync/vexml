import { MeasureSequenceIterator } from '@/playback/measuresequenceiterator';

describe(MeasureSequenceIterator, () => {
  it('is empty when there are no measures', () => {
    const iterator = new MeasureSequenceIterator([]);

    expect(iterator).toBeEmpty();
  });

  it('is the same as the input when there are no repeats', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [] },
      { index: 1, jumps: [] },
      { index: 2, jumps: [] },
    ]);

    expect([...iterator]).toEqual([0, 1, 2]);
  });

  it('repeats a single measure', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 1 }] },
    ]);

    expect([...iterator]).toEqual([0, 0]);
  });

  it('repeats a single measure multiple times', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 3 }] },
    ]);

    expect([...iterator]).toEqual([0, 0, 0, 0]);
  });

  it('repeats a single measure when the start is not at the beginning', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [] },
      { index: 1, jumps: [{ type: 'repeatstart' }] },
      { index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
    ]);

    expect([...iterator]).toEqual([0, 1, 2, 1, 2]);
  });

  it('repeats multiple measures', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 1]);
  });

  it('repeats multiple measures multiple times', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatend', times: 2 }] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 1, 0, 1]);
  });

  it('repeats endings', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatending', times: 1 }] },
      { index: 2, jumps: [] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 2]);
  });

  it('repeats multiple endings', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatending', times: 2 }] },
      { index: 2, jumps: [] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 1, 0, 2]);
  });

  it('handles implicit start repeats', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [] },
      { index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 1]);
  });

  it('handles multiple implicit start repeats', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [] },
      { index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
      { index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 1, 2, 0, 1, 0, 1, 2]);
  });
});

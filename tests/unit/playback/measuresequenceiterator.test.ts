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

  it('handles a repeat ending with an implicit start', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [] },
      { index: 1, jumps: [{ type: 'repeatending', times: 1 }] },
      { index: 2, jumps: [] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 2]);
  });

  it('continues past a repeat block', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
      { index: 2, jumps: [] },
      { index: 3, jumps: [] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 1, 2, 3]);
  });

  it('handles a standalone repeat start with no matching end', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [] },
      { index: 1, jumps: [{ type: 'repeatstart' }] },
      { index: 2, jumps: [] },
    ]);

    expect([...iterator]).toEqual([0, 1, 2]);
  });

  it('handles two non-nested repeats in sequence', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
      { index: 2, jumps: [{ type: 'repeatstart' }] },
      { index: 3, jumps: [{ type: 'repeatend', times: 1 }] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 1, 2, 3, 2, 3]);
  });

  it('replays an inner repeat during each pass of an outer repeat', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatstart' }] },
      { index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
      { index: 3, jumps: [{ type: 'repeatend', times: 1 }] },
    ]);

    expect([...iterator]).toEqual([0, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 3]);
  });

  it('plays the 1st ending N times before advancing to the 2nd ending', () => {
    // | start | ending(2) | ending(1) | end |
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatending', times: 2 }] },
      { index: 2, jumps: [{ type: 'repeatending', times: 1 }] },
      { index: 3, jumps: [] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 1, 0, 2, 3]);
  });

  it('plays three endings in order, each once', () => {
    // | start | ending(1) | ending(1) | ending(1) | end |
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatending', times: 1 }] },
      { index: 2, jumps: [{ type: 'repeatending', times: 1 }] },
      { index: 3, jumps: [{ type: 'repeatending', times: 1 }] },
      { index: 4, jumps: [] },
    ]);

    expect([...iterator]).toEqual([0, 1, 0, 2, 0, 3, 4]);
  });

  it('treats a repeatend with times: 0 as a no-op', () => {
    const iterator = new MeasureSequenceIterator([
      { index: 0, jumps: [{ type: 'repeatstart' }] },
      { index: 1, jumps: [{ type: 'repeatend', times: 0 }] },
    ]);

    expect([...iterator]).toEqual([0, 1]);
  });
});

### The rule

Continue a melisma extender uninterrupted beneath short rests within the span of a single syllable until the last written notehead of that syllable. See Behind Bars p. 447.

### The test case

`vocal-extenders.musicxml` sustains one syllable (`drift`) across two short eighth rests within measure 3 using `<extend type="start"/>` on beat 1 and `<extend type="stop"/>` on beat 4.

- Measure 3. Quarter note (`drift`, extend start), eighth rest, eighth note, eighth rest, eighth note, and quarter note (extend stop).

### Renderers

- Behind Bars: agrees, runs the extender continuously beneath the short rests to the last notehead of the syllable
- MuseScore: differs, omits the extender line across the eighth rests in measure 3
- Verovio: agrees, runs the extender continuously from `drift` beneath both eighth rests to the beat 4 notehead
- OSMD: differs, omits the extender line across the eighth rests in measure 3

### Checks

1. In measure 3, does the melisma extender continue uninterrupted from `drift` beneath both eighth rests to the final quarter notehead?
   Crop: measure 3, 3 above, 7 below

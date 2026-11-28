### The rule

Set sung text below the vocal stave in roman type at a comfortable, consistent size (roughly one stave-space lower-case x-height), without shrinking lengthy syllables on short note-values. See Behind Bars p. 438.

### The test case

`vocal-underlay.musicxml` sets sung text below the vocal stave across ordinary quarter notes in measures 2–3 and dense sixteenth notes with lengthy syllables in measure 7, with no explicit lyric font overrides.

- Measures 2–3. Quarter-note vocal phrase in default roman text below the stave.
- Measure 7. Lengthy syllables (`Drift-ing chill clouds`) on beamed sixteenth notes alongside shorter syllables (`pass, we`) on quarter notes.

### Renderers

- Behind Bars: agrees, sets vocal text below the stave in roman type at a uniform readable size (about one stave-space lower-case height) without shrinking long syllables
- MuseScore: agrees, sets all syllables below the stave in uniform roman type (~1 stave-space x-height) without shrinking lengthy sixteenth-note syllables
- Verovio: agrees, sets all syllables below the stave in uniform roman type (~1 stave-space x-height) without shrinking lengthy sixteenth-note syllables
- OSMD: agrees, sets all syllables below the stave in uniform roman type (~1 stave-space x-height) without shrinking lengthy sixteenth-note syllables

### Checks

1. Across measures 2–3 and measure 7, is the sung text set below the stave in roman type at a consistent readable size without shrinking lengthy syllables on short notes?
   Crop: measure 7, 3 above, 7 below

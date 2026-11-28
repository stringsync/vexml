### The rule

Place the bold italic `tr` sign above the stave in single-voice writing, flush with the left edge of the notehead, further from the note than articulation marks and closer than a fermata, long slur or octave sign. See Behind Bars p. 135.

### The test case

`trills.musicxml` isolates trill design and placement rules by measure.

- Measure 1. Four quarter notes with `<trill-mark/>`: low (`F4`), high (`G5`), with an accent (`B4`), and with a fermata (`D5`).

### Renderers

- Behind Bars: agrees, places `tr` above the stave, flush left with the notehead, above the accent and below the fermata
- MuseScore: agrees, places `tr` above the stave, above the accent and below the fermata
- Verovio: agrees, places `tr` above the stave, above the accent and below the fermata
- OSMD: differs, places `tr` above the fermata on beat 4

### Checks

1. In measure 1, does `tr` sit above the stave on every beat, above the accent on beat 3, and below the fermata on beat 4?
   Crop: measure 1, 6 above, 3 below
   Book: p. 135, 0.28 0.58 0.22 0.14

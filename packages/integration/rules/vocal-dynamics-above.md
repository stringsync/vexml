### The rule

In vocal music, place dynamics, hairpins, expression marks, and verbal instructions above the stave so the space below stays clear for the sung text. See Behind Bars p. 434.

### The test case

`vocal-clef-dynamics.musicxml` places dynamics, expression words, and hairpins without explicit `placement` attributes on a vocal stave carrying lyrics in measures 1 and 2.

- Measure 1. Forte dynamic, `con passione` text, and crescendo hairpin over four quarter notes with lyrics.
- Measure 2. Piano dynamic, `dolce` text, and diminuendo hairpin over four quarter notes with lyrics.

### Renderers

- Behind Bars: agrees, places dynamics, expression text, and hairpins all above the stave, leaving the space below clear for lyrics
- MuseScore: differs, places expression text above the stave but places dynamics and hairpins below the stave above the lyrics
- Verovio: differs, places dynamics, expression text, and hairpins below the stave
- OSMD: differs, places `f` and `con passione` below the stave in measure 1 while placing the hairpins and measure 2 marks above the stave

### Checks

1. In measure 1, do the dynamic, expression text, and crescendo hairpin all sit above the stave clear of the lyrics?
   Crop: measure 1, 7 above, 10 below
   Book: p. 434, 0.135 0.240 0.450 0.075
2. In measure 2, do the piano dynamic, `dolce` text, and diminuendo hairpin all sit above the stave clear of the lyrics?
   Crop: measure 2, 7 above, 10 below
   Book: p. 434, 0.390 0.240 0.485 0.075

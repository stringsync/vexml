### The rule

Draw an unbroken arpeggio across two staves as one continuous wavy line spanning from the lowest note of the lower stave to the highest note of the upper stave. See Behind Bars p. 132.

### The test case

`arpeggios-staves.musicxml` isolates grand-staff arpeggio rules by measure.

- Measure 1. A grand-staff whole-note chord (`C3-G3` bass, `C5-E5` treble) with `<arpeggiate unbroken="yes"/>` on all notes.

### Renderers

- Behind Bars: agrees, draws one continuous wavy line across both staves
- MuseScore: agrees, draws one continuous wavy line across both staves
- Verovio: agrees, draws one continuous wavy line across both staves
- OSMD: differs, draws two separate short wavy lines instead of one continuous line

### Checks

1. Does measure 1 draw one continuous wavy line spanning both staves?
   Crop: measure 1, 4 above, 18 below
   Book: p. 132, 0.09 0.34 0.15 0.10

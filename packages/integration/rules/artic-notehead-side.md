### The rule

Place articulation on the notehead side of each note, never below a down-stem. See Behind Bars p. 117.

### The test case

`articulation.musicxml` isolates each rule by measure.

- Measure 1. Staccato on two down-stemmed and two up-stemmed single notes.

### Renderers

- Behind Bars: agrees, marks on the notehead side
- MuseScore: agrees, dot above the down-stem note
- Verovio: agrees, dots above the down-stem notes
- OSMD: agrees, dot above the down-stem note

### Checks

1. Is each dot on its notehead side: above the down-stems, below the up-stems?
   Crop: measure 1, from 6 spaces, 8 spaces, 4 above, 6 below

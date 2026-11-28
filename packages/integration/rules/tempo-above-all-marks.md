### The rule

Place tempo indications above the uppermost stave and well clear of slurs, octave signs, articulations and other performance instructions. See Behind Bars p. 182.

### The test case

`tempo-indications.musicxml` stacks an accent, slur, `8va` octave shift, and `Allegro` tempo indication above measure 1.

- Measure 1. Down-stem notes D5, E5, and D5 (written D6, E6, and D6 under `8va`) with an accent on beat 1, an above-stave slur, an `8va` bracket, and `Allegro`.

### Renderers

- Behind Bars: agrees, places the tempo indication above the stave and clear of all other above-stave markings including octave signs
- MuseScore: agrees, places `Allegro` above the `8va` bracket, slur, and accent with clear separation
- Verovio: agrees, places `Allegro` above the `8va` bracket, slur, and accent with clear separation
- OSMD: agrees, places `Allegro` above the `8va` bracket, slur, and accent with clear separation

### Checks

1. Does `Allegro` sit above the `8va` bracket, slur, and accent with no overlap?
   Crop: measure 1, 7 above, 2 below

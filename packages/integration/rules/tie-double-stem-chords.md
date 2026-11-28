### The rule

In double-stemmed writing, curve every tie on a chord sharing one stem in that part’s direction. All upper-part ties curve up and all lower-part ties curve down, rather than splitting opposite ways inside each chord. See Behind Bars p. 67.

### The test case

`ties-voices.musicxml` gives each case its own measure.

- Measure 2. Voice 1 ties C5 E5 half chords; voice 2 ties E4 G4 half chords.

### Renderers

- Behind Bars: agrees, both upper ties curve up, both lower ties curve down
- MuseScore: agrees, both upper ties curve up, both lower ties curve down
- Verovio: agrees, both upper ties curve up, both lower ties curve down
- OSMD: differs, splits upper chord (E5 up, C5 down) while both lower ties curve down

### Checks

1. Do both upper-voice ties curve up and both lower-voice ties curve down?
   Crop: measure 2, 5 above, 5 below

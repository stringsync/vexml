### The rule

Indicate a key slap articulating a blown pitch with a `+` sign placed above the stave over the relevant note. See Behind Bars p. 259.

### The test case

`woodwind.musicxml` measure 6 places `<technical><stopped/></technical>` without explicit `placement` on a low up-stem F#4, a middle-line down-stem Bb4 with a tenuto, and a high down-stem D5.

- Measure 6. Quarter notes F#4 (`stopped`), Bb4 (`tenuto` + `stopped`), D5 (`stopped`), and a quarter rest.

### Renderers

- Behind Bars: agrees, places the `+` sign above the stave over each note, above any inner articulation such as tenuto
- MuseScore: agrees, places `+` above the stave over all three notes, above the tenuto on Bb4
- Verovio: agrees, places `+` above the stave over all three notes, above the tenuto on Bb4
- OSMD: differs, places `+` below the notehead on the up-stem F#4 instead of above the stave

### Checks

1. Does the `+` sign sit above the stave centred over each of the three notes, including above the low up-stem F#4 and above the tenuto on Bb4?
   Crop: measure 6, 6 above, 2 below
   Book: p. 259, 0.40 0.81 0.20 0.08

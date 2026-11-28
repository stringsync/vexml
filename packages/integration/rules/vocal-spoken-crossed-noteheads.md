### The rule

Use crossed (`x`) noteheads on a five-line vocal stave for spoken text, positioned at their written heights to show relative pitch inflection with stems attached cleanly and lyrics below. See Behind Bars p. 457.

### The test case

`vocal-sounds.musicxml` isolates vocal sound and speech notation rules across measures.

- Measure 3. Four quarter notes with `<notehead>x</notehead>` on treble clef at varying heights (E4, A4, D5, G4) with `spoken` above and lyrics below.

### Renderers

- Behind Bars: agrees, draws crossed noteheads at their written staff heights with stems attached and lyrics below
- MuseScore: agrees, draws all four crossed (`x`) noteheads at their written heights with stems attached and lyrics below
- Verovio: agrees, draws all four crossed (`x`) noteheads at their written heights with stems attached and lyrics below
- OSMD: agrees, draws all four crossed (`x`) noteheads at their written heights with stems attached and lyrics below

### Checks

1. Are all four crossed (`x`) noteheads drawn at their written staff positions with attached stems and lyrics clear below?
   Crop: measure 3, 5 above, 5 below
   Book: p. 457, 0.13 0.60 0.78 0.10

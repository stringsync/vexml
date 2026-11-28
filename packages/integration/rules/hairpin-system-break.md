### The rule

Leave a crescendo open at the start of the new system and a diminuendo open at the end of the old one when a hairpin runs across a system break. See Behind Bars p. 104.

### The test case

`hairpin-breaks.musicxml` isolates each rule by measure.

- Measures 1–2. A crescendo that starts in measure 1 and stops on the first note of measure 2, the first measure of a new system.
- Measures 3–4. A diminuendo that starts in measure 3 and stops on the first note of measure 4, the first measure of a new system.

### Renderers

- Behind Bars: agrees, leaves both hairpin ends open at the break
- MuseScore: differs, draws no hairpin at the start of the new system
- Verovio: differs, closes the diminuendo to a point at the end of the old system
- OSMD: agrees, leaves the hairpin ends open on both sides of the break

### Checks

1. Does the crescendo start open at the left of measure 2, the new system?
   Crop: measure 2, 2 above, 6 below
   Book: p. 104, 0.2 0.2 0.58 0.12

2. Does the diminuendo stay open at the right end of measure 3?
   Crop: measure 3, 2 above, 6 below
   Book: p. 104, 0.2 0.2 0.58 0.12

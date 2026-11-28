### The rule

When a beam extends across rests that start or finish a beat, draw short stemlets from the beam stopping short of each rest, with inner beams extending to those stemlets. See Behind Bars p. 165.

### The test case

`metre-stemlets.musicxml` writes 2/4 beams extending across opening and closing rests with `<stem>` elements on the rests.

- Measure 1. Two beamed eighth-note groups, one beginning on a rest and one ending on a rest.
- Measure 2. A beamed sixteenth-note group alternating notes and rests, ending on a sixteenth rest.

### Renderers

- Behind Bars: agrees, extends the beam across the rests with short stemlets stopping short of each rest
- MuseScore: differs, drops the beam across opening and closing rests and draws separate flagged eighth notes
- Verovio: agrees, extends the beam across the opening and closing rests with short stemlets stopping short of each rest
- OSMD: differs, drops the beam across opening and closing rests and draws separate flagged eighth notes

### Checks

1. Do the beams in measures 1 and 2 extend over the opening and closing rests with stemlets stopping short of each rest?
   Crop: measure 1, 2 above, 2 below
   Book: p. 165, 0.29 0.62 0.42 0.06

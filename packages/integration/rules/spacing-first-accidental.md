### The rule

Pull an altered opening note slightly toward its preceding signature, leaving at least one stave space to the nearest accidental so that it reads with the note. With one accidental, Gould suggests roughly one-and-a-half spaces after a clef or key signature alone, and one after a time signature. With several accidentals, roughly one space is the guide in each opening. (Behind Bars p. 42)

### The test case

`symbol-spacing.musicxml` uses one sharp at the start of measure 5 and two chord accidentals at the start of measure 6.

### Renderers

- Behind Bars: agrees, marks 1 space from the time signature to the opening accidental, with one accidental or several
- MuseScore: agrees, about 1½ spaces to the sharp and to the chord's nearest accidental
- Verovio: agrees, about 1½ spaces to the sharp and to the chord's nearest accidental
- OSMD: agrees, about 1½ spaces to the sharp and 1 to the chord's nearest accidental

### Checks

1. Is there at least one space between the time signature and the opening sharp?
   Crop: measure 5, from 6 spaces, 10 spaces
   Book: p. 42, 0.53 0.65 0.11 0.06

2. Is there at least one space between the time signature and the closest chord accidental?
   Crop: measure 6, from 6 spaces, 12 spaces, 5 above
   Book: p. 42, 0.66 0.65 0.12 0.06

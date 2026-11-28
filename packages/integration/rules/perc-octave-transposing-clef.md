### The rule

Clarify one- and two-octave tuned-percussion transpositions (such as xylophone and glockenspiel) with a treble clef carrying an `8` or `15` numeral above it (Behind Bars p. 276). The numeral prevents players from misreading octave-transposing instruments that are sometimes written at pitch or one octave down.

### The test case

`percussion-tuned.musicxml` isolates octave-transposing treble clefs across three measures in 4/4:

- Measure 1: opening treble clef with `<clef-octave-change>1</clef-octave-change>` (one octave higher).
- Measure 2: mid-system clef change to treble clef with `<clef-octave-change>2</clef-octave-change>` (two octaves higher).
- Measure 3: new system inheriting the two-octave-higher treble clef.

### Renderers

- Behind Bars: agrees, treble clef with `8` above for one-octave transposition and `15` above for two-octave transposition
- MuseScore: agrees, draws `8` above the opening treble clef and `15` above the mid-system and next-system treble clefs
- Verovio: agrees, draws `8` above the opening treble clef and `15` above the mid-system treble clef
- OSMD: differs, draws `8` above the opening treble clef but omits `15` on the two-octave clef

### Checks

1. Does measure 1 draw an `8` numeral above the treble clef, and do measures 2–3 draw a `15` numeral above the treble clef?
   Crop: measure 1, 3 above, 2 below
   Book: p. 276, 0.25 0.35 0.50 0.06

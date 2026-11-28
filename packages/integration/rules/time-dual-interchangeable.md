### The rule

Print interchangeable dual time signatures side by side at the outset, joining the second signature with parentheses, a slash or an equals sign. See Behind Bars p. 174.

### The test case

`metre-dual-time.musicxml` writes three interchangeable dual time signatures using `<interchangeable>` with `parentheses`, `slash` and `equals` relations.

- Measure 1. 2/4 (6/8) with `parentheses`.
- Measure 2. 3/4 / 9/8 with `slash`.
- Measure 3. 2/4 = 6/8 with `equals`.

### Renderers

- Behind Bars: agrees, sets both signatures side by side with parentheses, a slash or an equals sign between them
- MuseScore: differs, prints only the first time signature (2/4, 3/4) and omits the interchangeable second signature
- Verovio: differs, prints both signatures side by side but omits the parentheses and slash joiners
- OSMD: differs, prints only the first time signature (2/4, 3/4) and omits the interchangeable second signature

### Checks

1. Are the two signatures printed side by side with parentheses, a slash and an equals sign in measures 1–3, clear of the first note?
   Crop: measure 1, 2 above, 2 below
   Book: p. 174, 0.34 0.20 0.32 0.04

2. Are the slash and equals dual time signatures in measures 2 and 3 printed side by side clear of the first note?
   Crop: measure 2, 2 above, 2 below
   Book: p. 174, 0.34 0.20 0.32 0.04

### The rule

Make a tuplet bracket over a beamed group parallel to its beam, and keep it horizontal when beams within the tuplet slope in different directions or when a sloped bracket would collide with the stave. See Behind Bars p. 197.

### The test case

`tuplets-bracket.musicxml` tests beamed tuplet bracket angles in measures 6 and 7.

- Measure 6. Partially beamed ascending 3:2 eighth triplet (F4, A4 beamed eighths + eighth rest).
- Measure 7. 5:4 eighth quintuplet with two beamed ascending eighths (G4, B4), an eighth rest, and two beamed descending eighths (B4, G4).

### Renderers

- Behind Bars: agrees, slopes the bracket parallel to a single beam and keeps it horizontal across opposing beams
- MuseScore: differs, keeps the partially beamed ascending bracket horizontal while keeping opposing beams horizontal
- Verovio: agrees, slopes the partially beamed ascending bracket parallel to its beam and keeps opposing beams horizontal
- OSMD: differs, keeps the partially beamed ascending bracket horizontal while keeping opposing beams horizontal

### Checks

1. In measure 6, is the bracket over the partially beamed ascending triplet parallel to the beam?
   Crop: measure 6, 3 above, 2 below
   Book: p. 197, 0.32 0.38 0.36 0.07
2. In measure 7, does the bracket over the opposing-beam quintuplet remain horizontal?
   Crop: measure 7, 3 above, 2 below
   Book: p. 197, 0.41 0.50 0.18 0.05

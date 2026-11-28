### The rule

Place a both-hands harp damping sign between the two staves of a grand staff, and place a downbeat damping sign just after the barline. See Behind Bars p. 364.

### The test case

`harp-grand.musicxml` uses a braced two-staff harp part (treble and bass).

- Measure 2. A quarter-note chord in both staves followed by rests, with `<damp-all/>` on beat 2 (placement unspecified).
- Measure 3. A downbeat `<damp/>` (placement unspecified) at the start of a whole-rest bar.

### Renderers

- Behind Bars: agrees, places a both-hands damping sign between the two staves and a downbeat damping sign just after the barline
- MuseScore: differs, omits `<damp/>` and `<damp-all/>`
- Verovio: differs, omits `<damp/>` and `<damp-all/>`
- OSMD: differs, omits `<damp/>` and `<damp-all/>`

### Checks

1. In measure 2, is the `<damp-all/>` sign placed between the two staves?
   Crop: measure 2, 6 above, 15 below
   Book: p. 364, 0.22 0.56 0.56 0.10
2. In measure 3, is the downbeat `<damp/>` sign placed between the two staves just after the barline?
   Crop: measure 3, 6 above, 15 below
   Book: p. 364, 0.55 0.56 0.22 0.10

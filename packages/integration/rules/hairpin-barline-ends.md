### The rule

Let a hairpin cut through a barline, but never start or finish it on the barline itself, except for the reviewed `hairpin-stop-short-of-barline` case where a crescendo resolving into a nearby downbeat dynamic stops at the barline. See Behind Bars p. 105.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 8. A crescendo that starts on the third beat.
- Measure 9. The hairpin stops on the first note of the next bar.

### Renderers

- Behind Bars: agrees, stops the hairpin short of the barline
- MuseScore: agrees, draws no hairpin past the barline
- Verovio: agrees, ends the hairpin just after the barline, at the first note
- OSMD: agrees, runs the hairpin on into the next bar

### Checks

1. Does the hairpin end clear of the barline between measures 8 and 9?
   Crop: measure 9, 2 above, 6 below, from 0 spaces, 12 spaces
   Book: p. 105, 0.19 0.255 0.62 0.09

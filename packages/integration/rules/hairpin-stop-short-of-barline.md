### The rule

A hairpin that ends at the start of a bar is neatest stopping just short of the barline, though it may reach a first beat that sits well after the barline. See Behind Bars p. 105.

### The test case

`dynamics.musicxml` isolates each dynamics rule by measure.

- Measure 8. A crescendo that starts on the third beat.
- Measure 9. The hairpin stops on the first note of the next bar.

### Renderers

- Behind Bars: agrees, stops the hairpin short of the barline
- MuseScore: agrees, draws no hairpin in the next bar
- Verovio: differs, runs the hairpin on to the first note of the next bar
- OSMD: differs, runs the hairpin on past the first note of the next bar

### Checks

1. Does the hairpin stop short of the barline between measures 8 and 9, or run on to the first note?
   Crop: measure 9, 2 above, 6 below, from 0 spaces, 12 spaces
   Book: p. 105, 0.19 0.255 0.62 0.09

### Why a person decides

Gould calls stopping short of the barline neatest and also asks for the hairpin to reach a first beat that sits well after it, with no threshold between the two.

### The rule

Terminate a dashed tempo-alteration line with a downward vertical notch when the following tempo is not a consequence of the alteration. See Behind Bars p. 185.

### The test case

`tempo-indications.musicxml` uses `<bracket line-type="dashed" line-end="down"/>` after `poco accel.` before `a tempo`.

- Measure 10. `poco accel.` with dashed line ending in a downward notch before `a tempo`.

### Renderers

- Behind Bars: agrees, ends the dashed line with a small downward vertical notch before `a tempo`
- MuseScore: agrees, draws a dashed line with a vertical end hook before `a tempo`
- Verovio: differs, omits the dashed bracket and vertical notch
- OSMD: differs, omits the dashed bracket and vertical notch

### Checks

1. Does the dashed line after `poco accel.` terminate with a downward vertical notch before `a tempo`?
   Crop: measure 10, 7 above, 2 below

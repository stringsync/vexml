### The rule

Indicate an immediate pedal retake on an extension line with an upward V-shaped notch aligned with the new attack (including across a barline), and align a non-retaken bar-end release hook with the barline. See Behind Bars pp. 335–336.

### The test case

`piano-pedalling.musicxml` spans a damper pedal across measures 4 and 5 with `<pedal type="change" line="yes"/>` on beat 3 of measure 4 and beat 1 of measure 5, stopping at the end of measure 5.

- Measure 4–5. Retake notches occur at beat 3 (G3) of measure 4 and at the downbeat (D3) of measure 5, with the final upward release hook at the barline ending measure 5.

### Renderers

- Behind Bars: agrees, draws upward V-shaped retake notches under the new attacks and aligns the final release hook at the barline
- MuseScore: differs, draws a half-notch downward stroke at the retake rather than an upward V-shaped notch
- Verovio: differs, splits into separate square brackets rather than drawing a continuous line with V-shaped retake notches
- OSMD: agrees, draws an upward V-shaped retake notch under beat 3 on the continuous solid line

### Checks

1. Do upward V-shaped retake notches align beneath beat 3 of measure 4 and beat 1 of measure 5, with the final release hook aligned at the closing barline of measure 5?
   Crop: measure 4, staff 2, 2 above, 7 below
   Book: p. 335, 0.28 0.67 0.44 0.16

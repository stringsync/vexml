### The rule

Support non-power-of-two denominators (any integer division of the semibreve, such as 6 or 10) drawn as ordinary stacked time-signature numerals. See Behind Bars pp. 180–181.

### The test case

`metre-indications.musicxml` places unconventional denominators on the second system.

- Measure 4. Time signature `4/6`.
- Measure 5. Time signature `5/10` with a two-digit denominator.

### Renderers

- Behind Bars: agrees, draws `4/6` and `5/10` as standard stacked time-signature numerals
- MuseScore: agrees, draws `4/6` and `5/10` as stacked numerals
- Verovio: agrees, draws `4/6` and `5/10` as stacked numerals
- OSMD: agrees, draws `4/6` and `5/10` as stacked numerals

### Checks

1. Does measure 4 draw `4/6` as stacked time-signature numerals?
   Crop: measure 4, 2 above, 2 below
2. Does measure 5 draw `5/10` with `5` centred over `10`?
   Crop: measure 5, 2 above, 2 below

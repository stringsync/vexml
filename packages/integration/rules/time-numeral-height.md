### The rule

Time-signature numerals should span the full height of the five-line stave so they stand out clearly against the staff lines. See Behind Bars p. 152.

### The test case

`metre-time.musicxml` tests time-signature numeral height across single- and double-digit signatures.

- Measure 1. Opening 3/4 time signature.
- Measure 3. Mid-system 12/16 time signature.
- Measure 4. Mid-system 5/8 time signature.

### Renderers

- Behind Bars: agrees, numerals span from the top stave line to the bottom stave line
- MuseScore: agrees, numerals span the full height of the five-line stave in 3/4, 12/16 and 5/8
- Verovio: agrees, numerals span the full height of the five-line stave in 3/4, 12/16 and 5/8
- OSMD: differs, numerals sit slightly inside the outer stave lines rather than filling the full height

### Checks

1. Do the 3/4 numerals in measure 1 span from the top stave line to the bottom stave line?
   Crop: measure 1, 12 spaces, 2 above, 2 below
   Book: p. 152, 0.23 0.35 0.25 0.04

2. Do the 12/16 numerals in measure 3 span the full height of the five-line stave?
   Crop: measure 3, 6 spaces, 2 above, 2 below
   Book: p. 152, 0.23 0.35 0.25 0.04

3. Do the 5/8 numerals in measure 4 span the full height of the five-line stave?
   Crop: measure 4, 6 spaces, 2 above, 2 below
   Book: p. 152, 0.23 0.35 0.25 0.04

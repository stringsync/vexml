### The rule

In double-stopped artificial harmonics, vertically align each fundamental with its touched-pitch diamond on separate stems, offsetting one pair horizontally when voices have adjacent pitches. See Behind Bars p. 421.

### The test case

`strings-pizz-harmonics.musicxml` writes two voices of artificial harmonics sharing a stave, first non-adjacent and then adjacent.

- Measure 11. Beat 1–2: voice 1 G4+C5 and voice 2 B3+E4 (non-adjacent). Beat 3–4: voice 1 F4+B4 and voice 2 E4+A4 (adjacent seconds).

### Renderers

- Behind Bars: agrees, vertically aligns each fundamental with its diamond on separate stems and offsets the lower pair right when adjacent
- MuseScore: agrees, vertically aligns each fundamental with its hollow diamond on separate stems, offsetting the upper pair right when adjacent
- Verovio: agrees, vertically aligns each fundamental with its diamond on separate stems, offsetting the lower pair right when adjacent (while adding harmonic circles)
- OSMD: differs, merges adjacent voices onto touching offsets and adds `0` marks

### Checks

1. In measure 11, does each artificial harmonic's stopped head align vertically with its own diamond notehead on both the non-adjacent and adjacent double-stops?
   Crop: measure 11, 4 above, 4 below
   Book: p. 421, 0.15 0.25 0.70 0.11

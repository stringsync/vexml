### The rule

When a divided word crosses a system break, place a hyphen at the end of the first system (stopping short of the barline before a cautionary key or time signature change) and add a leading hyphen at the start of the new system before the continuing syllable, whether it lands on the first note or later. See Behind Bars p. 448.

### The test case

`vocal-hyphens.musicxml` splits two words across system breaks in measures 4–7: one ending on the first note of the new system after cautionary signatures (`ra-di-ant`), and one continuing across two slurred notes onto beat 3 of the new system (`ris-ing.`).

- Measures 4–5. `ra-di-` ends measure 4 before cautionary two-sharp key and `3/4` time signatures; `ant` lands on measure 5 beat 1.
- Measures 6–7. `ris-` begins a slur on measure 6 beat 2 across the system break; `ing.` lands on measure 7 beat 3.

### Renderers

- Behind Bars: agrees, places a trailing hyphen before the barline (short of cautionary signatures) at the end of system 1 and a leading hyphen at the start of the new system before the continuing syllable
- MuseScore: agrees, places a trailing hyphen before the cautionary signatures in measure 4, a leading hyphen before `ant` in measure 5, and a leading hyphen before `ing.` in measure 7
- Verovio: agrees, places a trailing hyphen before the cautionary signatures in measure 4, a leading hyphen before `ant` in measure 5, and a leading hyphen before `ing.` in measure 7
- OSMD: differs, omits the cautionary signatures in measure 4 and omits the leading hyphen before `ant` in measure 5, though it draws a trailing hyphen in measure 4 and a leading hyphen before `ing.` in measure 7

### Checks

1. Across measures 4–5, does a hyphen end measure 4 before the cautionary signatures and a leading hyphen precede `ant` at the start of measure 5?
   Crop: measure 4, 4 above, 7 below
   Book: p. 448, 0.160 0.525 0.690 0.070
2. At the start of measure 5 and measure 7 on the new systems, do leading hyphens appear before `ant` (beat 1) and before `ing.` (beat 3)?
   Crop: measure 5, 4 above, 7 below
   Book: p. 448, 0.160 0.525 0.690 0.070
3. At the start of measure 7, do hyphens lead across beats 1–2 into `ing.` on beat 3?
   Crop: measure 7, 4 above, 7 below
   Book: p. 448, 0.160 0.525 0.690 0.070

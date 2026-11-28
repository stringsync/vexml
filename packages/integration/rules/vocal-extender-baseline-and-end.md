### The rule

Draw a melisma extender at stave-line thickness level with the text baseline (not mid-height like a hyphen), placed after any punctuation, extending to the last written notehead of the syllable (not the end of its duration), and omit extenders on single-note syllables. See Behind Bars p. 447.

### The test case

`vocal-extenders.musicxml` shows a slurred two-note syllable with trailing comma (`wait,`), an unextended single-note syllable (`still`), and a tied half-note syllable with trailing exclamation mark (`call!`) ending on a half note before a half rest across measures 1–2.

- Measures 1–2. Two slurred eighths (`wait,` + extend), quarter (`still`, no extend), and two tied half notes (`call!` + extend across the barline) followed by a half rest.

### Renderers

- Behind Bars: agrees, draws baseline-level extenders at stave-line thickness after punctuation stopping at the last written notehead (not running across the half note’s duration) and draws no extender on single-note syllables
- MuseScore: agrees, draws baseline-level extenders after `wait,` and `call!` (none on `still`), continuing across the barline and stopping at the tied half notehead in measure 2
- Verovio: agrees, draws baseline-level extenders after punctuation (none on `still`), continuing `call!` across the barline and stopping at the tied half notehead in measure 2
- OSMD: agrees, draws baseline-level extenders after `wait,` and `call!` (none on `still`), continuing across the barline and stopping at the tied half notehead in measure 2

### Checks

1. In measure 1, does the extender after `wait,` sit on the text baseline after the comma ending at the second eighth notehead, with no extender on `still`, and does an extender begin after `call!`?
   Crop: measure 1, 4 above, 7 below
   Book: p. 447, 0.130 0.235 0.370 0.065
2. In measure 2, does the extender from `call!` continue across the barline and stop at the tied half notehead rather than running across its full duration to the half rest?
   Crop: measure 2, 4 above, 7 below
   Book: p. 447, 0.130 0.235 0.370 0.065

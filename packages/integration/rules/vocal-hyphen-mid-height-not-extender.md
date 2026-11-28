### The rule

Centre each hyphen horizontally between its two syllables midway between the baseline and top of lower-case letters, never placing hyphens on the baseline and never substituting an extender line between syllables of a word. See Behind Bars p. 448.

### The test case

`vocal-hyphens.musicxml` sets a two-syllable word whose first syllable spans three slurred notes (`val-ley`) followed by an adjacent two-syllable word (`gleam-ing`) in measure 1.

- Measure 1. Three slurred notes (`val-`), quarter note (`ley`), and two beamed eighths (`gleam-ing`).

### Renderers

- Behind Bars: agrees, centres mid-height hyphens between `val` and `ley` and between `gleam` and `ing` with no baseline extender between syllables
- MuseScore: agrees, centres mid-height hyphens between `val` and `ley` and between `gleam` and `ing` without using an extender
- Verovio: agrees, centres mid-height hyphens between `val` and `ley` and between `gleam` and `ing` without using an extender
- OSMD: agrees, centres mid-height hyphens between `val` and `ley` and between `gleam` and `ing` without using an extender

### Checks

1. In measure 1, are the hyphens centred horizontally between `val`/`ley` and `gleam`/`ing` at mid-height of lower-case letters (never attached directly to the left syllable or drawn as a baseline extender)?
   Crop: measure 1, 4 above, 7 below
   Book: p. 448, 0.270 0.265 0.460 0.070

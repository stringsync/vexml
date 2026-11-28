### The rule

Place dynamics and expression marks above each individual vocal stave, keeping them clear of the sung text belonging to the voice part above. See Behind Bars p. 465.

### The test case

`choral-four-stave.musicxml` places `<dynamics>` (`p` and `mf`) with `placement="above"` on Soprano and Alto staves directly beneath the lyrics of the vocal staves above them.

- Measures 1–2. `p` and `mf` above Soprano sit clear of Solo Soprano’s lyrics, and `p` and `mf` above Alto sit clear of Soprano’s lyrics.

### Renderers

- Behind Bars: agrees, places individual dynamics above each vocal stave clear of the text of the stave above
- MuseScore: agrees, places `p` and `mf` above Soprano and Alto clearly separated from the lyrics above
- Verovio: agrees, places `p` and `mf` above Soprano and Alto clearly separated from the lyrics above
- OSMD: agrees, places `p` and `mf` above Soprano and Alto clearly separated from the lyrics above

### Checks

1. Do the above-stave `p` and `mf` dynamics on Soprano and Alto stay clearly separated from the lyrics of the vocal staves above them?
   Crop: measure 1, part 2, 12 above, 14 below

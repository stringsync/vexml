### The rule

Place an elision undertie (a small tie-like curve beneath the text) to join two or three elided syllables sung to a single note. See Behind Bars p. 446.

### The test case

`vocal-underlay.musicxml` assigns elided syllables to single quarter notes in measure 8 using MusicXML `<elision/>` (empty default on two- and three-syllable elisions) and explicit `<elision>‿</elision>`.

- Measure 8. Beat 1 carries two syllables joined by `<elision/>` (`ma`, `un`), beat 2 carries three syllables joined by `<elision/>` (`tra`, `o`, `il`), and beat 3 carries `<elision>‿</elision>` (`di`, `al`).

### Renderers

- Behind Bars: agrees, draws a small undertie beneath the text between elided syllables sung on one note
- MuseScore: agrees, draws a curved undertie beneath the text for both empty `<elision/>` (two- and three-syllable elisions) and explicit `<elision>‿</elision>`
- Verovio: agrees, draws a curved undertie beneath the text for both empty `<elision/>` (two- and three-syllable elisions) and explicit `<elision>‿</elision>`
- OSMD: differs, collapses empty `<elision/>` into concatenated text (`maun`, `traoil`) and draws an undertie only for explicit `<elision>‿</elision>`

### Checks

1. In measure 8, is a visible elision undertie drawn beneath the text joining the elided syllables on beats 1–2 (`<elision/>`) as well as beat 3 (`<elision>‿</elision>`)?
   Crop: measure 8, 3 above, 7 below
   Book: p. 446, 0.280 0.750 0.230 0.065

### The rule

Indicate falsetto with a harmonic circle (`o`) placed above each relevant note, clear of ledger lines and above the stave, with any verbal `falsetto` instruction clear above it. See Behind Bars p. 456.

### The test case

`vocal-sounds.musicxml` isolates vocal sound and speech notation rules across measures.

- Measure 2. Bass clef with high ledger-line quarter notes (G3, A3, B♭3, A3), each carrying `<technical><harmonic/></technical>` with no `placement`, `falsetto` words direction above, and lyrics below.

### Renderers

- Behind Bars: agrees, places each harmonic circle directly above its ledger-line notehead with `falsetto` clear above
- MuseScore: agrees, draws ordinary noteheads with a harmonic circle (`o`) above each notehead and `falsetto` clear above
- Verovio: agrees, draws ordinary noteheads with a harmonic circle (`o`) above each notehead and `falsetto` clear above
- OSMD: agrees, draws ordinary noteheads with a harmonic circle (`o`) above each notehead and `falsetto` clear above

### Checks

1. Does every harmonic circle (`o`) sit above its high ledger-line notehead, clear of the stave, ledger lines, and `falsetto` label?
   Crop: measure 2, 7 above, 5 below
   Book: p. 456, 0.27 0.18 0.46 0.10

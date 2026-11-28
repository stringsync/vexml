### The rule

Draw a broken arpeggio (both hands rolling simultaneously) with a separate arpeggio sign (and arrow, if specified) per stave, each placed as close to its own chord as its accidentals allow rather than forcing alignment across staves. See Behind Bars p. 132.

### The test case

`arpeggios-staves.musicxml` isolates grand-staff arpeggio rules by measure.

- Measure 2. Beat 1 has separate plain arpeggios (`number="1"` treble with sharps, `number="2"` bass without accidentals); beat 3 has contrary-motion arrows (`direction="up"` treble, `direction="down"` bass).

### Renderers

- Behind Bars: agrees, draws separate wavy lines per stave, keeping each close to its chord and arrows in contrary motion
- MuseScore: agrees, draws separate wavy lines per stave, treble left of sharps and bass close to notes, with contrary-motion arrows
- Verovio: agrees, draws separate wavy lines per stave, treble left of sharps and bass close to notes, with contrary-motion arrows
- OSMD: agrees, draws separate wavy lines per stave, treble left of sharps and bass close to notes, with contrary-motion arrows

### Checks

1. In measure 2, does each stave draw its own wavy line close to its own chord (treble left of its sharps, bass close to its notes), with contrary-motion arrows on beat 3?
   Crop: measure 2, 4 above, 18 below
   Book: p. 132, 0.56 0.66 0.28 0.10

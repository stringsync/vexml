### The rule

Indicate a non-arpeggiated chord with a vertical square bracket encompassing the chord, extending as a single continuous bracket across both staves on a grand staff. See Behind Bars p. 132.

### The test case

`arpeggios-staves.musicxml` isolates grand-staff arpeggio and non-arpeggiate rules by measure.

- Measure 3. Beat 1 has a single-stave `F4-A4-C5` chord with `<non-arpeggiate>`; beat 3 has a grand-staff chord with `<non-arpeggiate type="bottom"/>` on staff 2 and `<non-arpeggiate type="top"/>` on staff 1.

### Renderers

- Behind Bars: agrees, draws a square bracket encompassing the single-stave chord and one continuous bracket across both staves
- MuseScore: agrees, draws a single-stave square bracket on beat 1 and one continuous square bracket across both staves on beat 3
- Verovio: agrees, draws a single-stave square bracket on beat 1 and one continuous square bracket across both staves on beat 3
- OSMD: differs, omits both non-arpeggiate brackets

### Checks

1. In measure 3, does beat 1 show a single-stave square bracket and beat 3 one continuous vertical square bracket across both staves rather than two separate brackets?
   Crop: measure 3, 4 above, 18 below
   Book: p. 132, 0.74 0.34 0.14 0.10

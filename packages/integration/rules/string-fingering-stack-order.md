### The rule

Place string fingering above the stave, above articulation and harmonic symbols and below bowing signs or string indications. See Behind Bars p. 396.

### The test case

`strings-techniques.musicxml` attaches `<fingering>` alone and combined with articulations, bowing signs, and string indications without explicit `placement`.

- Measure 6. Single-voice quarter notes (up-stem and down-stem) carrying fingerings 1, 2, 3, and 2.
- Measure 7. Quarter notes combining staccato + fingering + down-bow (beat 1), accent + fingering + up-bow (beat 2), and fingering + string number (beats 3–4).

### Renderers

- Behind Bars: agrees, places fingering above the stave, outside articulation marks and inside bowing signs and string indications
- MuseScore: differs, places fingering above bowing signs (beats 1–2), though below string numbers (beats 3–4)
- Verovio: differs, places fingering above bowing signs (beats 1–2) and omits string numbers (beats 3–4)
- OSMD: differs, places fingering above both bowing signs (beats 1–2) and Roman string numerals (beats 3–4)

### Checks

1. Do the single-voice fingerings in measure 6 sit above the stave regardless of stem direction?
   Crop: measure 6, 5 above, 2 below
   Book: p. 396, 0.17 0.405 0.66 0.09
2. In measure 7, does fingering sit above articulation marks and below bowing signs (beats 1–2) and string indications (beats 3–4)?
   Crop: measure 7, 7 above, 2 below
   Book: p. 396, 0.17 0.405 0.66 0.09

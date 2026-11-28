### The rule

Stack string symbols vertically from closest to furthest from the notehead in the order: articulation, open-string or harmonic circle, fingering, string indication, pause (fermata), and bowing (`⊓`/`∨`), placing them above the stave except for a lower voice with separate stems. See Behind Bars p. 427.

### The test case

`strings-ensembles.musicxml` tests stacked string symbols without explicit `placement` attributes in measures 3 and 4.

- Measure 3. Four single-voice quarter notes combining articulation, open-string/harmonic circles, fingerings, string numbers, fermata, and bowing signs.
- Measure 4. Two-voice divisi half notes with opposing stems where both voices carry articulations, open-string circles, and bowing signs.

### Renderers

- Behind Bars: agrees, stacks above the stave closest-to-furthest as articulation, open-string/harmonic, fingering, string number, fermata, bowing, and places lower-voice divisi symbols below the stave
- MuseScore: differs, places fingering, string numbers, and fermata outside bowing in measure 3, and stacks lower-voice bowing and open-string marks above the stave in measure 4
- Verovio: differs, places fingering and fermata outside bowing and omits string numbers in measure 3, while cleanly splitting upper and lower divisi symbols above and below the stave in measure 4
- OSMD: differs, places open-string/harmonic circles below noteheads and fingering outside bowing in measure 3, and places lower-voice bowing above the stave in measure 4

### Checks

1. In measure 3, do the stacked symbols sit above the stave ordered closest-to-furthest as articulation, open-string/harmonic circle, fingering, string number, fermata, and bowing?
   Crop: measure 3, 9 above, 3 below
   Book: p. 427, 0.250 0.800 0.335 0.105
2. In measure 4, do the upper voice's symbols sit above the stave and the lower voice's symbols sit below the stave?
   Crop: measure 4, 8 above, 7 below
   Book: p. 427, 0.575 0.800 0.175 0.115

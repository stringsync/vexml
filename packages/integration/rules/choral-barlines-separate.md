### The rule

Connect vocal staves with a systemic barline at the left edge of the system, but keep interior barlines separate on each vocal stave so they do not intersect the text underlay. See Behind Bars p. 463.

### The test case

`choral-four-stave.musicxml` declares `<group-barline>no</group-barline>` on the Soprano and Alto choir `<part-group>` across two measures with lyrics beneath every stave.

- Measures 1–2. Left systemic barline spans all three staves while the interior barline between measures 1 and 2 breaks cleanly between each vocal stave.

### Renderers

- Behind Bars: agrees, connects vocal staves on the left systemic barline and breaks interior barlines between staves
- MuseScore: agrees, connects staves at the left systemic barline and keeps interior barlines separate on each vocal stave
- Verovio: agrees, connects staves at the left systemic barline and keeps interior barlines separate on each vocal stave
- OSMD: agrees, connects staves at the left systemic barline and keeps interior barlines separate on each vocal stave

### Checks

1. Does the interior barline between measures 1 and 2 stay separate on each vocal stave without crossing the lyrics, while the left systemic barline connects the system?
   Crop: measure 1, part 2, 12 above, 14 below
   Book: p. 471, 0.17 0.59 0.76 0.21

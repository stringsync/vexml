### The rule

Where room allows, place nested tuplet indications on opposite sides of the group, with the outer (whole-group) indication on the stem side and the inner subdivided indications on the notehead side (with brackets). See Behind Bars p. 214.

### The test case

`tuplet-ratios.musicxml` gives each case its own measure.

- Measure 5. Two beats of nested triplets with no `placement` set: beat 1 stems up and beat 2 stems down.

### Renderers

- Behind Bars: agrees, places the outer bracketed numeral on the stem side and the inner bracketed numerals on the notehead side
- MuseScore: differs, places all imported `9` brackets on the stem side only
- Verovio: differs, draws only inner brackets on the stem side and omits the outer tuplet
- OSMD: differs, draws only two inner numerals on the stem side and omits the rest

### Checks

1. Are the outer and inner tuplet indications placed on opposite sides of each group, with the outer bracket on the stem side?
   Crop: measure 5, 5 above, 5 below
   Book: p. 214, 0.30 0.15 0.40 0.06

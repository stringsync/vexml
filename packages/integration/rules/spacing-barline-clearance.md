### The rule

Allow one space on either side of a barline, retaining at least one space to stems even if an accidental or grace note needs to approach within half a space. (Behind Bars p. 42–43)

### The test case

`symbol-spacing.musicxml` opens measure 11 straight after the barline with a down-stemmed F carrying a natural, with no grace note or signature between them. (The grace note opening measure 2 is `spacing-grace-after-barline`'s case.)

### Renderers

- Behind Bars: agrees, allows a space either side of a barline and keeps a stem at least a space away
- MuseScore: differs, draws the natural about ⅔ space from the barline, with the stem about 1¾ spaces away
- Verovio: agrees, draws the natural 1 space from the barline, with the stem nearly 2 spaces away
- OSMD: unavailable, breaks the system before measure 11, so no barline precedes its opening note

### Checks

1. Does the natural sign have a full stave space of clearance from the barline?
   Crop: measure 11, 7 spaces
   Book: p. 43, 0.28 0.26 0.43 0.07

2. Does the first stem stand at least one space from the barline?
   Crop: measure 11, 7 spaces
   Book: p. 43, 0.28 0.26 0.43 0.07

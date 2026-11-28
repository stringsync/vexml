### The rule

Enclose notes of a syllable omitted in an alternative text in round brackets (parentheses), and notate an additional alternative-text syllable replacing a rest as a bracketed cue-sized note. See Behind Bars p. 469.

### The test case

`choral-two-stave-satb.musicxml` measure 2 uses `<notehead parentheses="yes">normal</notehead>` on beat 1’s full-sized soprano/alto notes and on beat 3’s cue-sized soprano note (`<cue/>`, `<type size="cue">`).

- Measure 2. Beat 1 draws round parentheses around the full-sized noteheads; beat 3 draws round parentheses around the cue-sized soprano notehead.

### Renderers

- Behind Bars: agrees, encloses omitted full-sized notes and added cue-sized notes in round parentheses
- MuseScore: agrees, draws round parentheses around beat 1’s full-sized noteheads and beat 3’s cue-sized notehead
- Verovio: agrees, draws round parentheses around beat 1’s full-sized noteheads and beat 3’s cue-sized notehead
- OSMD: differs, omits the round parentheses around both the full-sized and cue-sized noteheads

### Checks

1. Are round parentheses drawn around beat 1’s full-sized noteheads and around beat 3’s cue-sized notehead?
   Crop: measure 2, part 1, 5 above, 8 below
   Book: p. 469, 0.28 0.80 0.44 0.11

### The rule

Draw the Bartók snap pizzicato symbol clearly above the note and stave without colliding with noteheads, stems, or ledger lines. See Behind Bars p. 382.

### The test case

`guitar-techniques.musicxml` isolates snap pizzicato placement in measure 7.

- Measure 7. A low note (`E3`), a mid-stave note (`A4`), and a high ledger-line chord (`E5-A5`), each carrying `<snap-pizzicato/>`.

### Renderers

- Behind Bars: agrees, places the Bartók snap pizzicato symbol cleanly above each note and stave
- MuseScore: agrees, places the Bartók snap pizzicato symbol cleanly above the stave on all three beats
- Verovio: agrees, places the Bartók snap pizzicato symbol cleanly above the stave on all three beats
- OSMD: differs, omits the mark on the low note and places the middle note's mark below the stave

### Checks

1. Does the snap pizzicato symbol sit cleanly above the stave and clear of notes, stems, and ledger lines on all three beats of measure 7?
   Crop: measure 7, 6 above, 4 below
   Book: p. 382, 0.33 0.66 0.34 0.10

### The rule

When an instrumentalist’s spoken rhythm sits on a single-line stave above the playing stave, place the spoken text between the spoken line and the playing stave without colliding with the playing stave, while keeping played dynamics below the playing stave. See Behind Bars p. 461.

### The test case

`vocal-instrumentalist-spoken.musicxml` renders a two-staff cello part whose top staff has `<staff-lines>1</staff-lines>` (crossed noteheads with spoken lyrics) and bottom staff is a five-line bass-clef cello stave with `pp` and `mf` dynamics.

- Measures 1–2. Spoken rhythms with `x` noteheads and lyrics on staff 1 above played cello notes and dynamics on staff 2.

### Renderers

- Behind Bars: agrees, places spoken rhythms and text cleanly above the playing stave with played dynamics below the playing stave
- MuseScore: agrees, places spoken lyrics cleanly between the single-line staff and five-line cello stave with played dynamics below
- Verovio: agrees, places spoken lyrics cleanly between the single-line staff and five-line cello stave with played dynamics below
- OSMD: agrees, places spoken lyrics cleanly between the single-line staff and five-line cello stave with played dynamics below

### Checks

1. Do the spoken lyrics under the single-line staff stay clear of the five-line playing stave below, with `pp` and `mf` dynamics below the playing stave?
   Crop: measure 1, staff 2, 10 above, 5 below
   Book: p. 461, 0.18 0.62 0.64 0.13

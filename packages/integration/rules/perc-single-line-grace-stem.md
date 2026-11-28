### The rule

On a single-line percussion stave, grace notes take upward stems regardless of the prevailing stem direction of the main notes (Behind Bars p. 283). Consistent upward stems keep grace notes immediately distinguishable from main-note rhythms on a one-line stave.

### The test case

`percussion-lines.musicxml` part 1 (`<staff-lines>1</staff-lines>`), measure 2: slashed eighth grace notes with `<stem>` omitted preceding main notes with explicit downward stems (and one with an upward stem).

### Renderers

- Behind Bars: agrees, grace note takes an upward stem even before down-stemmed main notes
- MuseScore: agrees, all three grace notes take upward stems before both down-stem and up-stem main notes
- Verovio: agrees, grace notes take upward stems regardless of main-note stem direction
- OSMD: agrees, grace notes take upward stems before down-stemmed main notes

### Checks

1. Do the grace notes on the single-line percussion stave in part 1, measure 2 take upward stems even before down-stemmed main notes?
   Crop: measure 2, part 1, 3 above, 3 below
   Book: p. 283, 0.50 0.63 0.27 0.08

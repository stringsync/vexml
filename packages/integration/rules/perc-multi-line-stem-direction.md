### The rule

On a two- or three-line percussion stave, stems point into the middle of the group of lines (upper-line notes down, lower-line notes up), just as on a five-line stave (Behind Bars p. 283).

### The test case

`percussion-lines.musicxml` part 2 (`<staff-lines>3</staff-lines>`) and part 3 (`<staff-lines>2</staff-lines>`), measure 1: alternating notes on the top and bottom lines of each stave with `<stem>` omitted.

### Renderers

- Behind Bars: agrees, stems point into the middle of the group of lines
- MuseScore: agrees, stems point toward the centre of the stave lines
- Verovio: differs, stems downward on the lower line of the reduced stave
- OSMD: differs, stems downward on both outer lines of the reduced staves

### Checks

1. On the 3-line stave (part 2, measure 1) and 2-line stave (part 3, measure 1), do top-line notes stem downward and bottom-line notes stem upward?
   Crop: measure 1, part 2, 3 above, 3 below

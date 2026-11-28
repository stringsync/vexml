### The rule

When a tied note transfers from one stave to the other, the tie crosses between staves and connects directly to both noteheads rather than stopping short like a slur. See Behind Bars p. 308.

### The test case

`keyboard-system.musicxml` gives each keyboard system rule its own measure(s).

- Measure 3. Middle-voice half note C4 on staff 1 tied downward to half note C4 on staff 2, framed by outer voices on both staves.
- Measure 4. Middle-voice half note C4 on staff 2 tied upward to half note C4 on staff 1, framed by outer voices on both staves.

### Renderers

- Behind Bars: agrees, draws a curved tie crossing between staves directly from the first C4 notehead to the second C4 notehead
- MuseScore: agrees, draws a single curved tie crossing smoothly between the two C4 noteheads in both directions
- Verovio: differs, draws a short open tie from the first notehead without reaching the target notehead on the other stave
- OSMD: differs, draws broken half-ties on each stave instead of a single cross-staff tie

### Checks

1. Does the downward cross-staff tie in measure 3 connect directly between the staff 1 C4 notehead and the staff 2 C4 notehead?
   Crop: measure 3, 2 above, 15 below
   Book: p. 308, 0.07 0.65 0.37 0.13
2. Does the upward cross-staff tie in measure 4 connect directly between the staff 2 C4 notehead and the staff 1 C4 notehead?
   Crop: measure 4, 2 above, 15 below
   Book: p. 308, 0.07 0.65 0.37 0.13

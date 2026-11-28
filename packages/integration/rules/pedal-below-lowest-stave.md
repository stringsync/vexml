### The rule

Place piano pedal indications beneath the lowest stave of a keyboard system, below all other notation including an `8vb` (`8va bassa`) octave-shift bracket. See Behind Bars p. 332.

### The test case

`piano-pedalling.musicxml` puts a bass-clef `8vb` octave shift (`<octave-shift type="up" size="8"/>`) and a damper pedal line on staff 2 of a grand staff.

- Measure 1. Four low bass quarter notes with an `8vb` bracket below staff 2 and a `Ped.` extension line spanning the bar.

### Renderers

- Behind Bars: agrees, pedal indications sit beneath the lowest stave and below any `8vb` bracket
- MuseScore: agrees, places `Ped.` and its extension line clearly below the `8` (`8vb`) dashed bracket
- Verovio: agrees, places the pedal line clearly below the `8` (`8vb`) dotted bracket (omitting the `Ped.` text)
- OSMD: agrees, places `Ped` and its extension line clearly below the `8vb` dashed bracket

### Checks

1. Does the pedal indication sit beneath the lowest stave and clearly below the `8vb` octave-shift bracket without colliding?
   Crop: measure 1, staff 2, 2 above, 9 below
   Book: p. 333, 0.14 0.72 0.26 0.20

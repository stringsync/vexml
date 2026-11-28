### The rule

Print tempo indications in bold roman type, larger than ordinary text, reserving italic for soloistic rubato or expression marks. See Behind Bars p. 182.

### The test case

`tempo-indications.musicxml` encodes tempo words with `<words>` paired with `<sound tempo="..."/>` and no explicit `font-weight` or `font-size`.

- Measure 1. `Allegro` at the opening (`tempo="120"`).
- Measure 3. `Presto` at a mid-system bar (`tempo="168"`).

### Renderers

- Behind Bars: agrees, prints `Allegro` and `Presto` in bold roman type, larger than ordinary text
- MuseScore: agrees, prints `Allegro` and `Presto` in bold roman type
- Verovio: agrees, prints `Allegro` and `Presto` in bold roman type
- OSMD: agrees, prints `Allegro` and `Presto` in bold roman type

### Checks

1. Are `Allegro` (measure 1) and `Presto` (measure 3) printed in bold roman type?
   Crop: measure 1, 6 above, 2 below
2. Is `Presto` in measure 3 printed in bold roman type?
   Crop: measure 3, 5 above, 2 below

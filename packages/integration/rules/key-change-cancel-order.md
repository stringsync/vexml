### The rule

When changing between two keys that both have accidentals (sharp to flat, or fewer accidentals of the same kind), traditional practice cancels the previous key with naturals in order before the new key signature after the barline, while contemporary practice prints only the new key signature. See Behind Bars pp. 92–93.

### The test case

`keys.musicxml` isolates each key-signature rule by measure.

- Measure 5. Change from 4 flats to 3 sharps with no explicit `<cancel>` element.
- Measure 6. Change from 3 sharps to 1 sharp with no explicit `<cancel>` element.

### Renderers

- Behind Bars: agrees, presents both traditional (naturals before the new key after the barline) and contemporary (new key only) practice
- MuseScore: agrees, uses contemporary practice (new key signature only) in both measures 5 and 6
- Verovio: agrees, uses contemporary practice (new key signature only) in both measures 5 and 6
- OSMD: agrees, uses contemporary practice on the new system (measure 5) and traditional cancelling naturals before the new sharp mid-system (measure 6)

### Why a person decides

Behind Bars presents both traditional practice (cancelling naturals before the new key signature) and contemporary practice (new key signature alone) as valid defaults when the score omits `<cancel>`.

### Checks

1. When changing from 4 flats to 3 sharps (measure 5) without an explicit `<cancel>`, should vexml draw cancelling naturals before the new key (traditional) or only the new key (contemporary)?
   Crop: measure 5, 3 above, 3 below
   Book: p. 92, 0.28 0.62 0.22 0.06

2. When reducing from 3 sharps to 1 sharp (measure 6) without an explicit `<cancel>`, should vexml cancel the dropped sharps with naturals before the new sharp (traditional) or draw only the new sharp (contemporary)?
   Crop: measure 6, 3 above, 3 below
   Book: p. 92, 0.21 0.82 0.28 0.06

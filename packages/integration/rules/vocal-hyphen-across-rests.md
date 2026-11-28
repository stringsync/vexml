### The rule

When a divided word spans rests, place hyphens before and after the rests rather than running a continuous chain of hyphens through an extended rest period. See Behind Bars p. 449.

### The test case

`vocal-alt-underlay.musicxml` gives each alternative-underlay rule its own measures.

- Measures 1–2. A three-syllable word (`wa-ter-fall`) spanning a short eighth rest between `wa` and `ter`, and a full measure of half rests across the barline between `ter` and `fall`.

### Renderers

- Behind Bars: agrees, places hyphens before and after rests without filling long rest passages with hyphens
- MuseScore: agrees, centres hyphens between divided syllables across the short rest and places a hyphen after `ter` before the long rest
- Verovio: agrees, centres hyphens between divided syllables across the short rest and places a hyphen after `ter` before the long rest
- OSMD: agrees, centres hyphens between divided syllables across the short rest and places a hyphen after `ter` before the long rest

### Checks

1. Are hyphens placed between `wa` and `ter` across the short rest and before `fall` without running hyphens across the extended half rests?
   Crop: measure 1, 2 above, 6 below
   Book: p. 449, 0.18 0.24 0.64 0.08

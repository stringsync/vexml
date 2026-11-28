### The rule

In dense setting keep neighbouring independent characters clear, with about half a stave space of breathing room. (Behind Bars p. 41)

### The test case

`symbol-spacing.musicxml` uses a short-note passage with chord accidentals and a mid-measure clef change.

### Checks

1. Do the independent signs stay legible and avoid crowding in the dense passage?
   Crop: measure 9, from 3 spaces, 9 spaces

### Why a person decides

The default clearance applies to independent signs, while glyphs within the same chord can nest. The boundary between those cases depends on the rendered shapes.

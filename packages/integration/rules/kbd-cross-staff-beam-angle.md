### The rule

Slope a double-stemmed cross-staff beam to follow a monotonic or outer-note pitch contour, and keep the beam horizontal when there is no net change in contour or the majority of notes contradict the outer pitches. See Behind Bars p. 315.

### The test case

`keyboard-cross-staff-beams.musicxml`, measure 2: beats 1 and 2 have an ascending monotonic cross-staff group (G2, B2, E4, A4) and beats 3 and 4 have an alternating cross-staff group with no net contour change (C3, G4, C3, G4).

### Renderers

- Behind Bars: agrees, slopes the ascending cross-staff beam upward and keeps the alternating cross-staff beam horizontal
- MuseScore: agrees, slopes the ascending cross-staff beam upward and keeps the alternating cross-staff beam horizontal between the staves
- Verovio: agrees, slopes the ascending cross-staff beam upward and keeps the alternating cross-staff beam horizontal between the staves
- OSMD: differs, places both beams above the upper stave and slopes the alternating beam upward as well

### Checks

1. Does the ascending cross-staff beam on beats 1–2 of measure 2 slope upward while the alternating cross-staff beam on beats 3–4 stays horizontal?
   Crop: measure 2, 2 above, 15 below
   Book: p. 315, 0.14 0.69 0.72 0.11

### The rule

In a beamed group of three or more notes containing only two pitches with a single odd note at one end, the beam is horizontal when that odd note is furthest from the beam and slopes when it is closest to the beam (Behind Bars p. 23). Slanting toward a single far note would give disproportionate visual weight to an isolated leap, while slanting toward a near note follows the contour naturally.

### The test case

`beams.musicxml`: measure 18 holds two four-eighth up-stem groups (G3, G4, G4, G4 with odd G3 furthest from the beam, expected flat; and A4, A4, A4, D5 with odd D5 closest to the beam, expected rising), checking each beam's slope direction.

### What to look for

In measure 18, a red box on the first group reports `rises` where it should stay `flat`, while a green box on the second group confirms it `rises` as expected.

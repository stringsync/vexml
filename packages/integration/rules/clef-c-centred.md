### The rule

A C clef centres vertically on whichever stave-line designates middle C: the third (middle) line for alto clef and the fourth line from the bottom for tenor clef (Behind Bars p. 6). Centring the clef's waist on the pitch line makes middle C unmistakable at a glance.

### The test case

`clefs.musicxml`: a five-line stave in 4/4 that changes to alto clef (`C` on line 3) in measure 2 and tenor clef (`C` on line 4) in measure 3, leaving clef placement to vexml.

### What to look for

Blue reference lines trace the middle line across measure 2 and the fourth line across measure 3. Each boxed C clef is labelled with its centre's vertical offset from its target line in quarter stave-spaces; both should read `0`.

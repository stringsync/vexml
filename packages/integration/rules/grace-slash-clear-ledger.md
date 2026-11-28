### The rule

Give a grace note on ledger lines a stem long enough that its diagonal stroke does not obscure a ledger line. See Behind Bars p. 126.

### The test case

`grace-notes.musicxml` isolates grace-note design and layout rules by measure.

- Measure 3. Beat 1 has a low slashed grace note on ledger lines (`A3` before `B3`); beat 3 has a high slashed grace note on ledger lines (`C6` before `B5`).

### Renderers

- Behind Bars: agrees, lengthens the ledger-line grace stem so the slash clears the ledger line
- MuseScore: agrees, lengthens the low A3 grace stem so the slash sits above the ledger line
- Verovio: agrees, lengthens the low A3 grace stem so the slash sits above the ledger line
- OSMD: differs, keeps a short stem on low A3 so the slash crosses the ledger line

### Checks

1. Do the diagonal slashes on both ledger-line grace notes in measure 3 stay clear of the ledger lines?
   Crop: measure 3, 5 above, 5 below
   Book: p. 126, 0.36 0.27 0.28 0.06

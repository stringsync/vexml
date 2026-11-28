# 5–37: Ground rules: stems, beams and rests

The pilot lands one rule end to end, the shape every later row follows: an original
fixture that leaves the attribute unset, a check that measures the render's ink masks
([engraving-ink.ts](../engraving-ink.ts)) in quarter stave-spaces, and a screenshot of the
fixture. The rest of the section is extracted one chunk per task in lane 281.

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |
| stave-lines | 5 | Stave terms and when fewer lines are used. | out of scope: terminology and an instrument choice the score makes |  |
| clef-g-f-on-line | 5 | The G clef curls round the second line and the F clef’s dots straddle the fourth. | judged by eye | [clefs](../engraving-clefs.test.ts) |
| clef-c-centred | 6 | A C clef centres on the line it makes middle C. | pass | [clefs](../engraving-clefs.test.ts) |
| clef-percussion-centred | 6 | A percussion clef fills the middle two spaces, or centres on a stave of fewer lines. | pass | [clef-percussion](../engraving-clefs.test.ts) |
| clef-indent | 6 | The opening clef stands in from the stave’s start by at most a stave-space. | pass | [clefs](../engraving-clefs.test.ts) |
| clef-every-system | 7 | Every stave but percussion opens each system with a clef. | pass | [clefs](../engraving-clefs.test.ts) |
| clef-change-smaller | 7 | A clef change after a system’s start is about two-thirds size. | pass | [clefs](../engraving-clefs.test.ts) |
| clef-courtesy-system-end | 7 | A clef change at a system’s start is warned of at the end of the system before. | pass | [clefs](../engraving-clefs.test.ts) |
| clef-choice | 7 | Which clef an instrument or passage uses. | out of scope: the score names its clef |  |
| clef-change-before-barline | 8 | A clef change at the start of a bar goes before its barline. | pass | [clefs](../engraving-clefs.test.ts) |
| clef-change-position | 8–9 | Where in a bar or beam group a clef change is written. | out of scope: the score places the change |  |
| notehead-design | 9–10 | The notehead’s shape and tilt. | out of scope: the glyph comes from the font (Bravura) |  |
| notehead-size | 10 | A notehead is a stave-space tall: it fills a space or centres on a line. | pass | [noteheads](../engraving-noteheads.test.ts) |
| notehead-diamond | 11 | A stem joins a diamond head at its side. | pass | [noteheads](../engraving-noteheads.test.ts) |
| notehead-cross | 11–12 | A stem joins a cross head at its edge. | pass | [noteheads](../engraving-noteheads.test.ts) |
| notehead-cross-white | 12 | Half and whole cross heads are circled. | pass | [noteheads](../engraving-noteheads.test.ts) |
| notehead-other-shapes | 11–13 | What triangle, slash and other heads mean and when to use them. | out of scope: the score chooses the head; stem joins are covered by the diamond and cross checks |  |
| stem-thickness | 13 | Stems are thinner than stave lines. | pass | [stems](../engraving-stems.test.ts) |
| stem-direction | 13 | Notes above the middle line stem down, notes below it stem up. | pass | [stems](../engraving-stems.test.ts) |
| stem-middle-line | 13–14 | A middle-line note follows its neighbours and its beat; with no clear case it stems down. | pass | [stems](../engraving-stems.test.ts) |
| stem-length | 14 | A stem is 3½ stave-spaces from the centre of its notehead. | pass | [stem-length](../engraving-stem-length.test.ts) |
| stem-ledger-middle | 14 | Notes on more than one ledger line stem to the middle line. | pass | [stems](../engraving-stems.test.ts) |
| stem-outside-shortened | 14–15 | In two-part writing outward stems shorten from 3½ to 3 to 2½ spaces, never less. | pass | [stems](../engraving-stems.test.ts) |
| stem-chord | 15 | A chord’s stem is measured from the note nearest its open end. | pass | [stems](../engraving-stems.test.ts) |
| tail-reach | 15 | An up-stem’s tail ends beside its head; a down-stem’s may touch the head. | pass | [tails](../engraving-stems.test.ts) |
| tail-design | 15–16 | The tail glyphs’ lengths and spacing. | out of scope: the glyphs come from the font (Bravura) |  |
| stem-flag-length | 15–16 | Eighth and sixteenth stems stay 3½; each further tail lengthens the stem. | pass | [stems](../engraving-stems.test.ts) |
| tail-short-stem | 16 | On a short stem the tail does not overshoot the head. | pass | [tails](../engraving-stems.test.ts) |
| tail-ledger-clear | 16 | Tails stay off ledger lines and the outer stave line. | pass | [tails](../engraving-stems.test.ts) |
| beam-thickness | 17 | A beam is ½ space thick, with ¼ space between beams. | pass | [beams](../engraving-beams.test.ts) |
| beam-stems-through | 17 | Every stem runs through to the outer beam. | pass | [beams](../engraving-beams.test.ts) |
| beam-fractional | 17 | A fractional beam is a notehead long. | pass | [beams](../engraving-beams.test.ts) |
| beam-horizontal-on-line | 17–18 | A horizontal beam in the stave hangs from, sits on or centres on a line. | pass | [beams](../engraving-beams.test.ts) |
| beam-four | 18 | Four beams spread to meet lines, or leave at most one in a space. | pass | [beams](../engraving-beams.test.ts) |
| beam-stem-length | 18–19 | With one or two beams a stem is 3½ for a space note and 3¼ for a line note. | pass | [beams](../engraving-beams.test.ts) |
| beam-extra-stems | 19 | With three or more beams no beam comes within 2½ spaces of the head. | pass | [beams](../engraving-beams.test.ts) |
| beam-ledger-clear | 19 | A clear stave line separates the innermost beam from the first ledger line. | pass | [beams](../engraving-beams.test.ts) |
| beam-slope-limit | 19–20 | A short group’s beam crosses at most one space, a long group’s at most two. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-slope-close | 20 | Close-set notes take only a slight angle, ¼ or ½ space. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-slope-ends-on-lines | 20–21 | Both ends of a slanted beam in the stave meet a line. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-slope-shortest-stem | 21 | A slanted group’s shortest stem is at least 3 inside the stave, 2½ outside. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-ledger-slight | 21 | Ledger-line groups slope ¼ for a second, ½ for wider intervals. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-slope-direction | 22 | A beam slants with the interval of its outer notes. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-horizontal-cases | 22–23 | Same-ended, repeating and concave groups take horizontal beams. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-convex | 23 | A convex group slopes. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-two-pitches | 23 | Two pitches with one odd end note: flat when it is furthest from the beam, else sloped. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-clef-change | 23 | A beam slants by stave position across a clef change and clears the clef. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-chord-angle | 24 | In chords the notes nearest the beam set its angle. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| beam-direction-equal | 24 | With equal numbers either side of the middle line, the furthest note sets the direction. | pass | [beams](../engraving-beams.test.ts) |
| beam-direction-majority | 24 | Otherwise the majority sets it, unless a far minority would stretch the stems. | pass | [beams](../engraving-beams.test.ts) |
| beam-direction-equidistant | 24–25 | Equidistant notes with nothing else to go by stem down. | pass | [beams](../engraving-beams.test.ts) |
| beam-direction-context | 25 | Direction chosen by the surrounding music or the look of the line. | out of scope: depends on context beyond one group, an editorial call |  |
| beam-divide-wide | 25 | Very wide groups may be split. | out of scope: the score writes its beaming |  |
| beam-kneed | 26 | A beam between opposite stems keeps stems ≥2½, clears the outer lines and slants with the interval. | pass | [beam angles](../engraving-beam-angles.test.ts) |
| ledger-thickness | 26 | Ledger lines are visibly thicker than stave lines. | pass | [ledgers](../engraving-ledgers.test.ts) |
| ledger-length | 26 | A ledger reaches past the head on both sides; neighbours’ ledgers never join. | pass | [ledgers](../engraving-ledgers.test.ts) |
| ledger-grace | 26 | Grace notes take shorter ledger lines. | pass | [ledgers](../engraving-ledgers.test.ts) |
| ledger-second-chord | 27 | Ledgers under a second span both heads; the last spans one head when the displaced note is in a space. | pass | [ledgers](../engraving-ledgers.test.ts) |
| ledger-shared-voices | 27 | Two parts share ledger lines without cutting through the inner part’s stem. | judged by eye | [ledgers](../engraving-ledgers.test.ts) |
| octave-numeral | 28 | The 8 is italic, 1½ spaces high, just left of the first note. | pass | [octave](../engraving-octave.test.ts) |
| octave-line-edge | 28 | The line runs from the top of an 8 above the stave, the base below. | pass | [octave](../engraving-octave.test.ts) |
| octave-clear | 29 | The octave sign sits outside other notation without cutting through it. | pass | [octave](../engraving-octave.test.ts) |
| octave-longest-outside | 29 | The longest of octave line, slur and tuplet bracket goes outside. | pass | [octave](../engraving-octave.test.ts) |
| octave-system-break | 30 | At a system’s end the line stops at the barline; the next system repeats the 8. | pass | [octave](../engraving-octave.test.ts) |
| octave-end-corner | 30 | The line ends in a corner just after the last head and its dots. | pass | [octave](../engraving-octave.test.ts) |
| octave-trill | 30 | Under a trill’s wavy line the octave line runs for the written duration. | pass | [octave](../engraving-octave.test.ts) |
| octave-single-note | 31 | An octave sign over one note takes an end corner. | pass | [octave](../engraving-octave.test.ts) |
| octave-vertical-line | 31 | A distant 8 takes a vertical dotted line to its note. | out of scope: an editorial aid; vexml places the 8 beside the notation and no fixture separates them |  |
| octave-usage | 31–34 | Octave signs across rests and repeats, loco, col 8, octave clefs, and ledger lines against 8va. | out of scope: the score writes where octave signs go |  |
| rest-design | 34–35 | The rest glyphs’ shapes and proportions. | out of scope: the glyphs come from the font (Bravura) |  |
| rest-whole-half | 34 | A whole rest hangs from the second line down; a half rest sits on the middle line. | pass | [rests](../engraving-rests.test.ts) |
| rest-breve | 35 | A breve rest fills the space above the middle line. | pass | [rests](../engraving-rests.test.ts) |
| rest-quarter | 35 | A quarter rest starts in the top space and finishes in the bottom space. | pass | [rests](../engraving-rests.test.ts) |
| rest-short | 35 | Shorter rests keep each hook in a separate stave space. | pass | [rests](../engraving-rests.test.ts) |
| rest-centred | 35 | Rests remain centred within the stave regardless of surrounding pitches. | pass | [rests](../engraving-rests.test.ts) |
| rest-whole-spaces | 35 | A displaced rest moves an exact number of stave spaces from its centred position. | pass | [rests](../engraving-rests.test.ts) |
| rest-beam | 36 | The beam keeps its normal position; a rest under it moves to clear the beam. | pass | [rests](../engraving-rests.test.ts) |
| rest-voices-sides | 36 | In two-part writing, upper-part rests sit above the middle line and lower-part rests below. | pass | [rests](../engraving-rests.test.ts) |
| rest-voices-half | 36 | Whole and half rests in two-part writing never stray across the middle line. | pass | [rests](../engraving-rests.test.ts) |
| rest-voices-simultaneous | 36 | Simultaneous rests in two parts are separated by at least one stave line. | pass | [rests](../engraving-rests.test.ts) |
| rest-voices-centre-optional | 36 | When one part lies on ledger lines, the other’s short rests may return to the centre. | out of scope: optional placement |  |
| rest-beat-align | 37 | Rests that belong to the same beat align horizontally. | pass | [rests](../engraving-rests.test.ts) |
| rest-displaced-outward | 37 | A rest displaced by a note in the other part moves further away from the stave, clear of it. | pass | [rests](../engraving-rests.test.ts) |
| rest-outside-ledger | 37 | A half or whole rest moved outside the stave sits on a ledger line. | pass | [rests](../engraving-rests.test.ts) |
| rest-level-with-pitches | 37 | A rest outside the stave sits level with its surrounding pitches. | judged by eye | [rests-voices](../engraving-rests.test.ts) |
| rest-editorial | 37 | Outer-line rest conventions, sharing identical rests, and splitting dense parts onto separate staves. | out of scope: an edition’s preference or score layout choice |  |

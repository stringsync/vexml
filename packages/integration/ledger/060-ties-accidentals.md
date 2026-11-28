# 60–89: Ties and accidentals

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |
| dot-unison-dotted-first | 60 | A dotted and undotted unison may put the dotted head first, so the dot separates the heads. | out of scope: the 2026-11-26 `dot-unison-one-voice` call keeps the upper voice first with all dots after both heads |  |
| dot-unison-ledger-split | 60 | On ledger lines, separate the ledger lines when the first-placed head is dotted, not when only the second is. | out of scope: follows from the dotted-first layout the 2026-11-26 `dot-unison-one-voice` call does not use |  |
| tie-function | 60 | A tie shows that a note is not struck again. | out of scope: defines the tie; the score says where ties go |  |
| tie-shape-symmetric | 60 | Draw a tie as a tapered arc, symmetrical about its middle, between two heads of the same pitch. | pass | [ties](../engraving-ties.test.ts) |
| tie-enharmonic | 60 | Two enharmonically equal pitches may be tied. | pass | [ties](../engraving-ties.test.ts) |
| tie-no-brackets | 60 | Never draw a square bracket as a tie. | out of scope: vexml draws every tie as an arc |  |
| tie-flatter-than-slur | 60 | Give a tie a flatter arc than a slur over the same notes. | pass | [ties](../engraving-ties.test.ts) |
| tie-near-heads | 60–61 | Run a tie from head to head, almost touching each. | pass | [ties](../engraving-ties.test.ts) |
| tie-depth | 61 | Bow a shallow tie about 1 to 1½ stave-spaces deep, enough to show through a stave line. | pass | [ties](../engraving-ties.test.ts) |
| tie-apex-off-line | 61 | Keep the middle of a tie’s curve off a stave line, so a tie inside the stave usually cuts through one. | pending | [ties](../engraving-ties.test.ts) |
| tie-short-confined | 61 | Keep a very short tie within one stave-space. | pass | [ties](../engraving-ties.test.ts) |
| tie-divide | 61 | A tie may be split when it cannot be drawn without hiding a head. | out of scope: an optional, cramped-case practice (see p. 133) the score would spell out |  |
| tie-long-flattened | 61 | Flatten a long tie so its curve is not much deeper than a short one’s. | pass | [ties](../engraving-ties.test.ts) |
| tie-flag-clear | 61 | Keep a tied chord’s flag clear of its ties, lengthening the stem if needed. | pass | [ties](../engraving-ties.test.ts) |
| tie-ends-centre | 62 | With room to spare and no articulation, start and end a tie at the centres of its heads. | pass | [ties](../engraving-ties.test.ts) |
| tie-articulation-clear | 62 | Keep a tie clear of articulation on its notes, bringing its ends to the heads’ edges or just inside them. | pass | [ties](../engraving-ties.test.ts) |
| tie-tight-long | 62 | Make a tie between tightly spaced notes as long as possible. | pass | [ties](../engraving-ties.test.ts) |
| tie-short-of-stem | 63 | Stop a tie short of the next stem unless parts overlap. | pass | [ties](../engraving-ties.test.ts) |
| tie-chord-inner-short | 63 | Start a chord’s inner ties after the heads and end them before the next heads; the outer ties may be full length or match. | pass | [ties](../engraving-ties.test.ts) |
| tie-chord-same-space | 63 | In a close-position chord, start each tie in the same stave-space as its head. | pass | [ties](../engraving-ties.test.ts) |
| tie-adjacent-close | 63 | In a chord with a second, start each tie close to its own head rather than after both. | pass | [ties](../engraving-ties.test.ts) |
| tie-dot-inside | 63 | Start a dotted note’s tie at the head, with the dot inside the curve and clear of it. | pass | [ties](../engraving-ties.test.ts) |
| tie-chord-dots-clear | 64 | On a dotted chord, place the ties so no dot is hidden, between the dots if they fit, otherwise after them. | pass | [ties](../engraving-ties.test.ts) |
| tie-away-from-stems | 64 | When both stems point the same way, curve the tie away from them. | pass | [ties](../engraving-ties.test.ts) |
| tie-stemless | 64 | Curve a tie between stemless notes as if they had stems. | pass | [ties](../engraving-ties.test.ts) |
| tie-mixed-stems-middle-line | 64 | When the two stems point opposite ways, curve the tie away from the middle line, which also keeps it off an up-stem flag. | pending | [ties](../engraving-ties.test.ts) |
| tie-system-break-ends | 65 | Stop a tie short of the system’s last barline, and resume it after the clef, key and time signature on the next system. | pass | [ties](../engraving-ties.test.ts) |
| tie-system-break-direction | 65 | Keep a tie’s direction over a system break even when the stems on either side differ. | pass | [ties](../engraving-ties.test.ts) |
| tie-system-break-symmetric | 65 | Keep each half of a broken tie a symmetrical arc. | pass | [ties](../engraving-ties.test.ts) |
| tie-chord-two-notes | 65 | Curve the two ties of a two-note chord in opposite directions. | pass | [ties](../engraving-ties.test.ts) |
| tie-chord-even | 65 | Curve an even number of chord ties half up and half down. | pass | [ties](../engraving-ties.test.ts) |
| tie-chord-odd | 65 | With an odd number of chord ties, curve the majority away from the stem. | pass | [ties](../engraving-ties.test.ts) |
| tie-same-direction-apart | 66 | Keep ties that curve the same way at least one stave-space apart, inside and outside the stave. | pass | [ties](../engraving-ties.test.ts) |
| tie-ledger-clear | 66 | Keep chord ties off ledger lines, by flattening them or moving them clear of the heads. | pass | [ties](../engraving-ties.test.ts) |
| tie-adjacent-away | 66 | Curve the two ties of a second away from each other, and let them set the direction of the chord’s other ties. | pass | [ties](../engraving-ties.test.ts) |
| tie-adjacent-pairs | 66 | When a chord holds two seconds, each pair may take opposite directions as long as the middle ties neither touch nor cross. | pass | [ties](../engraving-ties.test.ts) |
| tie-adjacent-consecutive | 66 | For consecutive seconds, curve parallel ties outward from the chord’s middle, one per stave-space. | pass | [ties](../engraving-ties.test.ts) |
| tie-double-stem-direction | 67 | In double-stemmed writing, curve the upper part’s ties up and the lower part’s ties down. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-double-stem-chords | 67 | In double-stemmed writing, curve every tie on a chord sharing one stem in that part’s direction. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-overlap-one-part | 67 | When overlapping parts are not tied simultaneously, curve each part’s tie towards its own stem as normal. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-overlap-no-stem-between | 67 | Place overlapping parts so a stem does not sit between a note and its tie, reversing the horizontal arrangement if needed. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-overlap-both-parts | 67 | When both overlapping parts are tied and normal directions would intersect, curve the ties away from their stems so they stay clear. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-overlap-cut-stem | 68 | Keep a tie close to its noteheads and let it cut through the other part’s stem rather than arching wide over the stem like a slur. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-stem-not-end-on-tie | 68 | Do not let another part’s stem end right on a tie; lengthen the stem to cross the tie or shorten it to clear. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-ledger-break | 68 | Break a tie rather than passing it between ledger lines when overlapping parts collide. | out of scope: an optional, cramped-case practice (like tie-divide, p. 61) the score would spell out |  |
| tie-ledger-no-intersect | 68 | Never allow a tie to pass between or intersect another part’s ledger lines; move it clear while keeping it flat rather than rounded like a slur. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-unison-single-each-head | 69 | On a single-stemmed perfect unison, give each notehead its own tie, upper for the left head and lower for the right. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-unison-stem-clear | 69 | On a tied single-stemmed unison, keep the stem clear of the ties. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-unison-no-cross | 69 | Ties on a chord containing a unison must not overlap or cross; point them to the other notehead if needed. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-unison-altered | 69 | On a tied altered unison, draw each tie between its own noteheads. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-unison-double-both | 69 | When two voices share a unison notehead and both are tied, draw a separate tie for each part. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-unison-double-one | 69 | When only one of two unison voices is tied, draw one tie and separate the two noteheads for clarity. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-unison-diff-durations | 70 | When tied unison voices have different durations, the noteheads may be reversed so the tied head sits nearer its tie. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-unison-dotted-right | 70 | When one of two unison voices is dotted and tied, the dotted head may sit on the right so the heads can close up. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-moving-away-from-change | 70 | In a single-stemmed chord where a note is added or released, curve the ties away from the added or released note. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-moving-alternate-sides | 70 | When one note is released on one side of a tied note and another is added on the other, curve the tie away from the added note. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-moving-passage-consistent | 71 | In a passage of moving single-stemmed chords, keep all ties in one consistent direction. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-moving-both-sides | 71 | When notes are added or released simultaneously above and below a tied note, place ties in their conventional directions. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-moving-clear-accidental | 71 | Curve a tie away from an added note with an accidental so the tie and accidental do not collide. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-chord-with-slur | 71 | When a slur connects chords with a tied note, curve the tie and slur the same way, the slur outside the tie (follows reference renderers over Behind Bars). | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-moving-unchanging-revert | 71 | Within a passage of moving chords, chords tied without a pitch change revert to conventional tie directions. | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-open-lv | 72 | Draw a short open tie extending from a notehead to show a note rings on beyond its written duration (laissez vibrer). | pass | [ties-voices](../engraving-ties-voices.test.ts) |
| tie-open-long-rest | 72 | A long open tie extending to a rest or barline holds a note for its full written length; avoid short French open ties in place of complete ties. | out of scope: composer notation choice; the score supplies the ties and rests |  |
| tie-lv-marking | 72–73 | Laissez vibrer markings, continuing open ties over barlines, dividing rests for damping points, and avoiding a tied release notehead. | out of scope: composer and copyist notation advice; the score supplies the text, rests, and ties |  |
| tie-lv-pedal | 73 | Pedalled instruments use pedal markings rather than laissez vibrer ties for pedalled sustain. | out of scope: instrumentation and composer notation advice; the score supplies pedal marks or ties |  |
| acc-sharp-design | 77 | Draw a sharp about a stave-space wide, with sloping parallel crossbars meeting the lines and vertical strokes reaching just under a space beyond them. | out of scope: the glyph comes from the SMuFL music font, drawn to its proportions |  |
| acc-flat-design | 77 | Draw a flat with a stem about 2½ spaces long and a bowl just under a space wide that fills a stave-space. | out of scope: the glyph comes from the SMuFL music font, drawn to its proportions |  |
| acc-natural-design | 77 | Draw a natural just under a space wide, with crossbars like a sharp’s and strokes reaching a space beyond them. | out of scope: the glyph comes from the SMuFL music font, drawn to its proportions |  |
| acc-double-flat-design | 77 | Draw a double flat as two flats set together, usually touching. | out of scope: the glyph comes from the SMuFL music font, drawn to its proportions |  |
| acc-double-sharp-design | 78 | Draw a double sharp as a stylized cross one space wide and high. | out of scope: the glyph comes from the SMuFL music font, drawn to its proportions |  |
| acc-small-grace-cue | 78 | Scale an accidental down only before a grace or cue note. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-ledger-placement | 78 | Centre an accidental exactly on its note’s line or space, taking care on ledger notes. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-bar-and-octave | 78 | An accidental lasts to the end of the bar and only at the octave written. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-clef-change | 78 | After a clef change, a note of the same pitch needs its accidental again. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-octave-sign | 79 | Repeat an accidental for a pitch at another octave, even one written under an octave sign. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-other-stave | 79 | An accidental holds only on its own stave; confirm or cancel the pitch on another stave in the same bar. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-shared-stave-parts | 79 | In one player’s part, an accidental applies to every voice on the stave. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-doubled-parts | 79–80 | When several performers share a stave, confirm or cancel each accidental in every part, restating it when another part altered it. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-tie-hold | 80 | An accidental crosses a barline only on a tied note; the pitch repeated later in the next bar needs its own sign. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-tie-system-break | 80 | Repeat a tied note’s accidental at the start of a new system, optionally in brackets, but not where many tied chords would crowd it. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-tie-barline | 80–81 | Do not repeat a tied accidental after every barline. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-double-cancel | 81 | Cancel a double flat or sharp with the single sign alone, no natural. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-after-barline | 81 | Restate or cancel an altered pitch that recurs just after the barline, even when the key signature corrects it, unless an enharmonic change makes it redundant. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-performance-extra | 82 | In performance material, add accidentals to a pitch that recurs within a few bars. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-octave-displacement | 82 | Confirm a pitch at a different octave, and the original pitch on returning to it. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-cautionary-use | 82–83 | Use cautionary accidentals to confirm pitches a reader might question, such as augmented intervals and close dissonances. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-cautionary-round | 83 | Enclose a cautionary accidental in round brackets. | judged by eye | [accidentals](../engraving-accidentals.test.ts) |
| acc-cautionary-chord-pairs | 83 | On a chord, give each cautionary accidental its own pair of brackets. | judged by eye | [accidentals](../engraving-accidentals.test.ts) |
| acc-cautionary-many | 83 | With many cautionary accidentals, write them unbracketed or small above their notes, and explain the practice in a preface. | out of scope: the score chooses brackets, placement and preface |  |
| acc-editorial-square | 83 | Keep square brackets round an accidental for editorial additions. | judged by eye | [accidentals](../engraving-accidentals.test.ts) |
| acc-small-above | 83 | Draw a cautionary or editorial accidental placed above its note small and directly above it. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-grace-notes | 84 | Accidentals hold for grace and measured notes alike; repeat or cancel them between the two for safety. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-ornament-upper-lower | 84 | Put an ornament’s accidental above the ornament for its upper note and below for its lower note. | judged by eye | [accidentals](../engraving-accidentals.test.ts) |
| acc-ornament-confirm | 84–85 | Confirm or cancel altered pitches for an ornament and afterwards, and overrule a key signature with an accidental. | out of scope: the score’s accidental marks say which ornaments carry a sign |  |
| acc-spelling | 85 | Spell pitches with familiar intervals, sharps rising and flats falling, stepwise figures by adjacent letters, and no mid-phrase respelling. | out of scope: the score spells its pitches |  |
| acc-systems | 86–87 | An alternative accidental system must be stated and applied consistently. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-unbarred | 87 | In music without barlines, an accidental holds for its note, immediate repeats and its beamed group. | out of scope: the score’s `<accidental>` elements say which notes carry a sign |  |
| acc-chord-close-alternate | 87, 89 | Order a close chord’s accidentals by stave position, the highest nearest the chord, then the lowest, then alternating, rather than descending. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-chord-octave-align | 88 | Align accidentals an octave or more apart. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-chord-seventh | 88 | Align accidentals a seventh apart that stay clear of each other, otherwise offset the lower slightly left. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-chord-sixth-flat-top | 88 | Align accidentals a sixth apart under an upper flat. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-chord-sixth-sharp-top | 88 | Under an upper sharp or natural a sixth above, offset the lower accidental slightly left; two sharps never overlap. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-chord-fifth-higher-closest | 88 | For accidentals a fifth or less apart, put the higher nearest the chord and the lower to its left. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-chord-fourth-fifth-overlap | 88 | Flats and naturals a fourth or fifth apart may overlap as long as they do not join. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-chord-seventh-outer | 89 | In a chord spanning a seventh or more, align the outer accidentals nearest, then alternate the rest from the highest. | pass | [accidentals](../engraving-accidentals.test.ts) |
| acc-chord-wide-pairs | 89 | In a wide chord of overlapping sevenths or wider, align the accidentals in pairs. | pass | [accidentals](../engraving-accidentals.test.ts) |

Gould’s placing advice on p. 78 (an accidental close to its note, clear of the sign before it) and p. 87 (chord accidentals evenly spaced, right of the barline and clear of it) restates [spacing-accidental-compact](../rules/spacing-accidental-compact.md) and [spacing-barline-clearance](../rules/spacing-barline-clearance.md), pp. 42–43, so it adds no rows here.

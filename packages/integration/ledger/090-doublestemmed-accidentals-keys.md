# 90–122: Double-stemmed accidentals, keys, dynamics and articulation

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |
| acc-chord-octave-offset | 90 | Align octave accidentals in a chord, offsetting other accidentals to the left. | pass | [accidentals-voices](../engraving-accidentals-voices.test.ts) |
| acc-chord-adjacent-order | 90 | For chords with adjacent altered notes, accidentals may run in descending order right to left (recommended) or conventional outer-closest order (acceptable). | judged by eye | [accidentals-voices](../engraving-accidentals-voices.test.ts) |
| acc-chord-adjacent-close-conventional | 90 | For a close-position chord with several accidentals including adjacent notes, use the conventional alternating arrangement rather than descending order. | pass | [accidentals-voices](../engraving-accidentals-voices.test.ts) |
| acc-downstem-tuck | 90 | On a down-stemmed chord with a displaced notehead, tuck an accidental closer to the stem than the displaced note wherever there is room, including octave accidentals. | pass | [accidentals-voices](../engraving-accidentals-voices.test.ts) |
| acc-double-stem-order | 90–91 | In double-stemmed writing, place accidentals before both parts in single-stemmed order, uppermost accidental closest to the notes. | pass | [accidentals-voices](../engraving-accidentals-voices.test.ts) |
| acc-double-stem-adjacent-reverse | 91 | When double-stemmed adjacent or overlapping notes put the higher-pitched note to the left, the accidental order may be reversed to mirror the notes. | judged by eye | [accidentals-voices](../engraving-accidentals-voices.test.ts) |
| acc-double-stem-altered-unison | 91 | In a double-stemmed altered unison, separate the noteheads and place each accidental beside its own part so it clearly belongs to that voice. | pass | [accidentals-voices](../engraving-accidentals-voices.test.ts) |
| key-placement-order | 91 | Place the key signature at the start of every relevant stave, after the clef and before the time signature. | pass | [keys](../engraving-keys.test.ts) |
| key-cycle-of-fifths-clefs | 91 | Arrange key-signature accidentals in cycle-of-fifths order in each clef, using the ascending tenor-clef layout for sharps. | pass | [keys](../engraving-keys.test.ts) |
| key-spacing-sharps | 92 | Space key-signature sharps so adjacent crossbar edges align vertically without overlapping. | pass | [keys](../engraving-keys.test.ts) |
| key-spacing-flats | 92 | Space key-signature flats evenly so each flat clears the previous one without overlapping, even across ascending fourths. | pass | [keys](../engraving-keys.test.ts) |
| key-change-after-barline | 92 | Place a mid-system key change after the barline. | pass | [keys](../engraving-keys.test.ts) |
| key-change-double-barline | 92 | Precede a key change with a double barline only when it starts a new musical section. | out of scope: the score’s `<bar-style>` element says when a double barline precedes a key change |  |
| key-change-cancel-to-open | 92–93 | When changing to a key with no sharps or flats, cancel the previous key signature with naturals in the cancelled key’s order after the barline. | pass | [keys](../engraving-keys.test.ts) |
| key-change-cancel-order | 92–93 | When changing between keys with accidentals, either cancel the previous key with naturals in order before the new key after the barline (traditional) or draw only the new key (contemporary). | pending | [keys](../engraving-keys.test.ts) |
| key-change-system-break | 93 | When a key change coincides with a system break, place the cancelling naturals and new key signature at the end of the first system, and only the new key signature at the start of the new system. | pass | [keys](../engraving-keys.test.ts) |
| key-clef-simultaneous | 93 | At a simultaneous clef and key change, place the new clef before the barline and the new key signature after the barline in the new clef. | pass | [keys](../engraving-keys.test.ts) |
| key-per-stave | 93–94 | Allow independent key signatures on different staves of a multi-stave instrument or ensemble score. | pass | [keys](../engraving-keys.test.ts) |
| key-unconventional | 94 | Support unconventional key signatures selecting arbitrary sharp or flat pitches. | pass | [keys](../engraving-keys.test.ts) |
| microtone-definition | 94 | Non-twelve-tone pitch symbols require a written definition in the score. | out of scope: composer and preface advice; the score supplies definitions |  |
| microtone-arrow-accidentals | 94 | Draw arrowed quarter-tone accidentals with clear, legible arrowheads attached to the accidental glyph. | pass | [microtones](../engraving-microtones.test.ts) |
| microtone-arrow-confirm | 95 | After a conventional accidental on the same pitch in a bar, confirm or cancel with an accidental alongside any microtonal arrow. | out of scope: the score’s `<accidental>` elements say which sign appears on each note |  |
| microtone-arrow-spelling | 95 | Use upward arrows in sharpening contexts, downward arrows in flattening contexts, and clear enharmonic equivalents for quarter-tones. | out of scope: composer note-spelling advice; the score spells its pitches |  |
| microtone-arrow-meaning | 96 | An arrow attached to an accidental modifies that accidental by a quarter-tone in the arrow’s direction. | out of scope: defines pitch semantics; the score supplies `<accidental>` |  |
| microtone-fixed-symbols | 96 | Draw the standard fixed quarter-tone symbols (half-sharp, three-quarters-sharp, reversed flat, flat-and-a-half) distinctly. | pass | [microtones](../engraving-microtones.test.ts) |
| microtone-other-symbols | 96–97 | Design non-quarter-tone microtonal symbols to be compact, legible, placed before the note, and given one consistent definition per piece. | out of scope: composer symbol-design and preface advice; MusicXML places accidentals before the note |  |
| microtone-cancel | 98 | Under conventional accidental practice, cancel a microtonal alteration with an ordinary accidental. | out of scope: the score’s `<accidental>` elements say which notes carry a cancelling sign |  |
| dyn-below-single-stave | 101 | Place the dynamics of a part on its own single stave below the stave, so they read as one line under the notes. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-typography | 101 | Set dynamics in a bold italic face, with f about 2½ spaces tall, p 2 and m, s and z 1, and other wording in plain lower-case italic. | out of scope: letter shapes and sizes come from the music font |  |
| dyn-shared-stave-common | 101 | Parts sharing a stave share one dynamic below the stave unless they take separate stems and their own dynamics. | out of scope: the score’s `<voice>` and `placement` say which part a dynamic belongs to |  |
| dyn-vocal-above | 101 | Place vocal dynamics above the stave to keep clear of the text. | out of scope: the score’s `placement` says above or below; vocal text is a later section |  |
| dyn-braced-between | 101 | Place dynamics for braced keyboard and harp parts between the two staves, and shared score dynamics centred between adjacent staves. | out of scope: keyboard and score layout, covered in their own sections |  |
| dyn-close-to-notes | 101 | Place dynamics as close to their notes as possible after articulation, slurs, octave signs and tuplet brackets are in. | out of scope: no distance stated; the collision stack decides the order |  |
| dyn-centre-on-notehead | 102 | Centre each dynamic horizontally on the notehead it belongs to, so it cannot be mistaken for belonging to a neighbouring note. | pass | [dynamics](../engraving-dynamics.test.ts) |
| hairpin-clear-of-lines | 102 | Never let a hairpin cross a stave line: a mark drawn on the stave becomes inconspicuous or illegible. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-middle-voice-beside-note | 102 | Put a separate dynamic for a middle voice beside its notehead. | out of scope: the score’s `default-x` and `default-y` position a voice’s own dynamic |  |
| dyn-bowl-on-line | 102 | Draw p so its bowl crosses a stave line and f so its crossbar avoids one, to stay legible. | out of scope: glyph shapes come from the music font |  |
| dyn-encroach-outer-spaces | 102 | In exceptional cases let a dynamic reach into the outer stave-spaces to save vertical room. | out of scope: an exceptional allowance, not a default |  |
| dyn-multi-char-align-last | 103 | When a closely following note takes a different dynamic, move a dynamic of three or more letters (such as `ppp`) left so its last letter sits under the note and it clears the next dynamic. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-left-not-right | 103 | When space is tight, move a dynamic to the left of its note, never to the right, since the note has already started. | pass | [dynamics](../engraving-dynamics.test.ts) |
| hairpin-thickness | 103 | Draw a hairpin with strokes as thick as a stave line. | pass | [dynamics](../engraving-dynamics.test.ts) |
| hairpin-open-end-max | 103 | Keep the open end of a hairpin no wider than two stave-spaces. | pass | [dynamics](../engraving-dynamics.test.ts) |
| hairpin-complementary-match | 103 | Give a crescendo and the diminuendo that follows it open ends of the same width, side by side on one horizontal line. | pass | [dynamics](../engraving-dynamics.test.ts) |
| hairpin-width-constant | 103 | Keep a hairpin's open end the same width whatever dynamics it joins: the opening does not show how big the change is. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-barline-break | 103 | Breaking a barline for a dynamic is acceptable, but continuous barlines are best when the dynamic can move. | out of scope: an optional practice; barlines stay continuous |  |
| hairpin-start-end-heads | 104 | Start a hairpin at the left edge of the first notehead it covers and finish it no later than the following note, never before a note starts or after it ends. | pass | [dynamics](../engraving-dynamics.test.ts) |
| hairpin-system-break | 104 | Leave a crescendo open at the start of the new system and a diminuendo open at the end of the old one when a hairpin runs across a system break. | pass | [hairpin-breaks](../engraving-dynamics.test.ts) |
| hairpin-barline-ends | 105 | Let a hairpin cut through a barline, but never start or finish it on the barline itself. | pass | [dynamics](../engraving-dynamics.test.ts) |
| hairpin-stop-short-of-barline | 105 | A hairpin that ends at the start of a bar is neatest stopping just short of the barline, though it may reach a first beat that sits well after the barline. | pending | [dynamics](../engraving-dynamics.test.ts) |
| dyn-horizontal-alignment | 105 | Keep a run of dynamics and hairpins on one horizontal line, since the eye follows a progression that runs parallel to the stave. | pass | [dynamics](../engraving-dynamics.test.ts) |
| hairpin-tilt-contour | 105 | A hairpin may slope to follow the contour of the pitches, avoiding steep gradients. | out of scope: an optional choice; the score’s `default-y` tilts a hairpin |  |
| dyn-cresc-dashes | 106 | Follow `cresc.` with widely spaced dashes that start after the word and show how long the change lasts. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-text-outside-hairpin | 106 | Place qualifying words (such as `poco a poco`) above or below a hairpin and never inside it. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-long-use-words | 106 | Use hairpins for short changes and the words cresc. or dim. for long ones. | out of scope: composer advice |  |
| dyn-qualifying-words | 106 | Qualifying words like poco a poco or molto signal a gradual change, a sudden one or a change from the pattern. | out of scope: composer advice on wording |  |
| dyn-qualifying-position | 106 | Words before or after a hairpin read as part of the start or finish dynamic, so place them above or below. | out of scope: composer advice; the placement of the words is checked by dyn-text-outside-hairpin |  |
| dyn-interim-brackets | 106 | Put interim dynamics in brackets, unless the hairpin is broken at the dynamic. | out of scope: the score supplies the brackets as `<words>` |  |
| dyn-interim-hairpin-angle | 107 | When a hairpin is broken for an interim dynamic, keep the same angle on both sides so it reads as one gradual change. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-subito-placement | 107 | Set `sub.` on the same line as the sudden dynamic, usually to its right, so the dynamic sits exactly under its note. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-interim-sparing | 107 | Use interim dynamics sparingly, or add reminders after rests or at a new system. | out of scope: composer advice |  |
| dyn-subito-purpose | 107 | Use subito to mark a dynamic that is not the logical end of a hairpin. | out of scope: composer advice; the placement of sub. is checked by dyn-subito-placement |  |
| hairpin-niente-circle | 108 | Draw a small circle at the closed end of a hairpin for a crescendo from nothing or a diminuendo to nothing, attached to the hairpin. | pass | [dynamics](../engraving-dynamics.test.ts) |
| dyn-sudden-stroke | 108 | Where sub. does not fit, separate sudden dynamic changes with a vertical stroke or dotted line. | out of scope: an alternative notation the score supplies |  |
| dyn-hold-line | 108 | Follow a dynamic with a horizontal line to say the level does not change. | out of scope: a notation the score supplies |  |
| dyn-repeat-reminders | 108 | Repeat dynamics after rests in ensemble music, and write repeated patterns out rather than using simile. | out of scope: composer advice |  |
| slur-tapered-arc | 109 | Draw a slur as a tapered arc, thicker in the middle and thinner at the tips, with one consistent curve. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-tilts-with-pitch | 109 | When a slur's outer notes are at different pitches, tilt the slur from the lower end up to the higher one. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-long-flat | 109 | Flatten a long slur so it stays close to the stave rather than bowing far out. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-meaning | 109 | A slur means different things to wind, string and vocal players, in addition to phrasing. | out of scope: describes meaning, not engraving |  |
| slur-looks-like-tie | 109 | A slur between notes of one pitch can look just like a tie because it is symmetrical. | out of scope: describes appearance, not a drawing rule |  |
| slur-in-space | 110 | Place the slur's arc in a stave-space rather than along a stave line, so it is most conspicuous. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-same-direction | 110 | When every stem under a slur points the same way, put the slur on the notehead side, between the outer noteheads. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-mixed-stems-above | 110 | When a slur spans notes whose stems point both ways, place it above the stave unless a beam is in the way. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-stemless-as-stemmed | 110 | For stemless notes, place a slur as if the notes had stems; for notes on the centre line, treat them as down-stemmed. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-end-near-heads | 110 | End a slur between half a stave-space and a space and a half from the notehead centres, close without touching. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-long-above-dynamics | 110 | In cramped writing a long slur may go above the stave to clear dynamics. | out of scope: a case-by-case layout call |  |
| slur-keyboard-left-hand | 110 | A left-hand keyboard slur may go below the stave to clear mid-system dynamics. | out of scope: keyboard layout, covered in its own section |  |
| slur-clear-articulation | 111 | Where staccato or tenuto marks fall under a slur, keep the slur clear of them, outside the marks, rather than drawing it through them. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-opposite-stems-tilt | 111 | When a slur's outer notes have opposite stem directions, move the slur toward the noteheads so it does not tilt against the direction of the pitches. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-outside-beam | 111 | Keep a slur drawn at the stem end outside any beam, never crossing it. | pass | [slurs](../engraving-slurs.test.ts) |
| slur-closer-at-stem-end | 111 | Where nothing is obstructed, a slur at the stem end may sit slightly closer to the noteheads, beside the stems. | out of scope: an optional refinement |  |
| slur-break-ends | 112 | Finish a slur at the end of a system just short of the last barline, never beyond it. | pass | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-break-resume | 112 | Start the carried-over slur at the new system after the clef and key signature, before the note and its accidental. | pass | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-break-same-side | 112 | Keep both halves of a slur across a system break on the same side of the stave. | pass | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-break-open-tilt | 112 | Tilt the open slur that starts on the last note of a system towards the pitch it reaches on the next system, so it reads as open-ended. | pass | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-divided-phrase | 112–113 | Cover a whole phrase with one slur and do not divide it between notes or around tied notes. | out of scope: the score's `<slur>` elements say where each slur starts and stops |  |
| slur-nested | 113 | Put the shorter of two simultaneous slurs closest to the notes and the longer one outside it. | pass | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-tied-ends | 113 | When a final pitch is extended by tied notes, end the slur on the first whole-bar note, or on the first tied note in cramped writing; start on the first of tied notes. | out of scope: the score's `<slur>` elements say which note each slur ends on |  |
| slur-dotted | 113 | Use a dotted slur where individual notes in a phrase are rearticulated. | out of scope: the score's `line-type` says a slur is dotted |  |
| slur-two-sets-winds | 113 | Avoid two sets of slurs in wind and string music. | out of scope: composer advice |  |
| slur-chord-single | 114 | Give all the notes on one stem a single slur, not one per note. | pass | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-chord-adjacent-centre | 114 | On a chord with adjacent notes, centre the slur on the notehead that lies on the correct side of the stem. | judged by eye | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-rests-solid | 114 | When a phrase includes rests, a solid slur is equally valid and less fussy. | out of scope: an optional choice the score's `line-type` makes |  |
| slur-double-stemmed-own | 114 | With separately stemmed parts, give each part its own slurs. | out of scope: the score's voices each carry their own `<slur>` elements |  |
| artic-definition | 114 | Articulation marks are read by context; state at the start of a piece how they should be performed. | out of scope: describes meaning and composer advice, not engraving |  |
| artic-intensity-terms | 115 | Replace accent symbols with sforzando or rinforzando terms, modified by the dynamic. | out of scope: composer advice; the score supplies the words |  |
| artic-schoenberg-stress | 115 | Place Schoenberg's stress symbols above the stave, outside other articulation, except in double-stemmed writing. | out of scope: MusicXML has no stress-symbol element |  |
| artic-repeated | 116 | Notate repeated articulation in full first, then use sempre or simile. | out of scope: composer advice; the score supplies the words |  |
| artic-symbol-design | 116 | Draw articulation marks about notehead size, with a bold wedge and a dot smaller than a duration dot. | out of scope: glyph shapes come from the music font |  |
| artic-notehead-side | 117 | Place articulation on the notehead side of each note, never below a down-stem. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-double-stem-stem-end | 117–118 | In double-stemmed writing, put each part's articulation at its stem end, never on the notehead side and no closer than the stem end. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-strong-above | 117 | Place the strong accent above the stave whatever the stem direction. | pass | [articulation-marks](../engraving-articulation-marks.test.ts) |
| artic-space-limited-above | 117 | When space below the stave is limited, put all articulation above. | out of scope: an optional allowance, not a default |  |
| artic-double-unison-own | 117 | Give each part its own articulation in double-stemmed writing, even for unisons. | out of scope: the score's voices each carry their own articulation |  |
| artic-centred-notehead | 118 | Centre articulation in line with its notehead. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-stacc-stem-end | 118 | A lone staccato at a stem end may centre on the stem, on the notehead, or sit beside the stem when cramped. | out of scope: Gould allows all three; the score's `placement` picks |  |
| artic-stacc-with-marks-centre | 118 | When staccato combines with other marks, centre the dot on the notehead like them. | pass | [articulation-marks](../engraving-articulation-marks.test.ts) |
| artic-stave-space | 119–120 | Centre articulation on the stave in a stave-space, so a line never obscures it. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-first-clear-space | 119 | Put articulation on the stave no closer to its note than the first clear stave-space. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-consistent-distance | 119 | Place articulation the same distance from each notehead so the eye follows it easily. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-stemless-as-stemmed | 119 | Place articulation on a stemless note as if it were stemmed, treating the middle line as down-stemmed. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-adjacent-chord-centre | 119 | On a chord of adjacent notes, centre articulation on the notehead on the correct side of the stem. | judged by eye | [articulation](../engraving-articulation.test.ts) |
| artic-stemless-two-parts | 119 | With two parts on one stave, move stemless notes' articulation close to the noteheads. | out of scope: a corner of stemless double-stemmed writing the score's voices decide |  |
| artic-ledger-outer | 120 | When a ledger-line note's articulation falls between it and the stave, put it no closer to the note than the outermost stave-space. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-accent-outside-stave | 120 | Place accents and staccato wedges outside the stave, moving them in only when they would be far from the note. | pass | [articulation-marks](../engraving-articulation-marks.test.ts) |
| artic-extra-mark-own-space | 120 | Give a second articulation mark its own stave-space further from the note; never cram two into one space. | pass | [articulation-marks](../engraving-articulation-marks.test.ts) |
| artic-stem-end-gap | 121 | Leave about half a stave-space between a stem end and articulation outside the stave. | pass | [articulation](../engraving-articulation.test.ts) |
| artic-tenuto-ledger-distance | 121 | Keep tenuto lines further from ledger lines than other marks, so the eye does not confuse the two. | pass | [articulation-marks](../engraving-articulation-marks.test.ts) |
| slur-artic-accent-outside | 121–122 | Put accents on the first and last notes of a slur outside it, so the slur stays close to the noteheads. | pass | [articulation-marks](../engraving-articulation-marks.test.ts) |
| artic-stem-end-in-stave | 121 | Within the stave, put articulation in the first clear space beyond the stem end. | out of scope: stems ending inside the stave are rare; artic-first-clear-space checks the clear space |  |
| artic-stacc-within-stem | 121 | Only staccato dots and wedges may fall within the length of the stem. | out of scope: a permission, not a default |  |
| slur-artic-order | 121 | The smallest signs go closest to the notehead, inside the slur. | out of scope: covered by slur-clear-articulation and slur-artic-middle-inside |  |
| slur-centre-stem | 122 | Centre a slur on the stems at its ends when it sits at the stem ends. | pass | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-staccato-centre-stem | 122 | Keep the slur centred on the stems at its ends when staccato dots sit at the stem ends. | pass | [slur-structure](../engraving-slur-structure.test.ts) |
| slur-mixed-stem-artic | 122 | When notes under a slur have mixed stem directions, put the articulation beside each notehead even though the slur is above. | pass | [articulation](../engraving-articulation.test.ts) |
| slur-artic-middle-inside | 122 | Put articulation on the middle notes of a slur inside the slur. | pass | [articulation](../engraving-articulation.test.ts) |
| slur-tenuto-centre-head | 122 | With a tenuto line between a slur and a stem, centre the slur on the notehead like the tenuto line. | pass | [articulation-marks](../engraving-articulation-marks.test.ts) |
| slur-artic-accent-exception | 122 | An accent at a slur end may go inside it when it would otherwise be too far from the note. | out of scope: an optional exception |  |
| slur-same-pitch-articulation | 122 | Between two notes of one pitch, articulation between slur and heads means rearticulated; outside, a tie. | out of scope: the score's `<tied>` and `<slur>` elements say which is meant |  |

Print pages 99–100 open Chapter 4 (*Dynamics and Articulation*) with its title and contents pages and carry no notation rules.

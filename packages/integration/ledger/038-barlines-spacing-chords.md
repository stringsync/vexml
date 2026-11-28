# 38–59: Barlines, spacing, chords and dots

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |
| spacing-pages-rests | 38 | Dotted rests and placement on one-line staves conclude the preceding rests section. | out of scope: outside this extract’s barline and spacing scope |  |
| barline-single-weight | 38 | Make the ordinary barline heavier than the stave lines and stems so it stays readable among notes. | pass | [barlines](../engraving-barline-spacing.test.ts) |
| barline-systemic | 38 | Join the staves at the opening of a system so they read as one score. | pass | [barline-score](../engraving-barline-spacing.test.ts) |
| barline-solo-left-edge | 38 | Keep the opening of a stand-alone single-stave part free of a systemic barline. | pass | [barlines](../engraving-barline-spacing.test.ts) |
| barline-thin-double | 39 | Mark a section division with two ordinary-weight strokes about three-quarters of a stave space apart. | pass | [barlines](../engraving-barline-spacing.test.ts) |
| barline-section-choice | 39 | Reserve thin doubles for section boundaries and movements played without a pause. A metre change alone does not call for one. | out of scope: the score specifies section breaks and intentional divider style |  |
| barline-final | 39 | Close a movement with a thin stroke about half a stave space before a beam-weight stroke. | pass | [barlines](../engraving-barline-spacing.test.ts) |
| barline-final-choice | 39 | Use the final thin and thick divider only at an actual movement ending. | out of scope: movement boundaries are authored score content |  |
| barline-repeat | 39 | Replace the ordinary divider at a repeat with an oriented thin and thick pair and repeat dots. | pass | [barlines](../engraving-barline-spacing.test.ts) |
| rhythm-compressed-gaps | 39–40 | Allow more room after longer values, compressing their distances relative to literal elapsed time so the rhythm stays readable. | pass | [rhythmic-spacing](../engraving-barline-spacing.test.ts) |
| rhythm-rest-gaps | 39–40 | Give each longer duration at least as much horizontal room as shorter neighbours, including when the event is a rest. | pass | [rhythmic-spacing](../engraving-barline-spacing.test.ts) |
| rhythm-literal-time | 39 | Use literal duration-to-distance ratios only in time-space notation. | out of scope: time-space notation belongs to the later proportional-spacing section |  |
| rhythm-equal-within-system | 40 | Keep equal note values evenly spaced within a system, even when the tempo changes. | pass | [rhythmic-spacing](../engraving-barline-spacing.test.ts) |
| rhythm-system-density | 40 | Keep similarly populated systems comparable, allowing a different spacing unit when a system contains substantially more notation. | judged by eye | [rhythmic-spacing](../engraving-barline-spacing.test.ts) |
| rhythm-barline-beat | 41 | Place the divider at or slightly before the next beat position. | pass | [rhythmic-spacing](../engraving-barline-spacing.test.ts) |
| rhythm-optical-stems | 41 | Use small adjustments between differently directed stems when identical head spacing looks uneven. | judged by eye | [rhythmic-spacing](../engraving-barline-spacing.test.ts) |
| rhythm-whole-bar-note | 41 | Balance a lone note slightly left of centre in a narrow bar when every part has a single duration. | pass | [rhythmic-spacing](../engraving-barline-spacing.test.ts) |
| rhythm-wide-whole-bar-note | 41 | A lone bar-length note in a wide bar can sit closer to the opening divider to avoid looking isolated. | judged by eye | [barline-score](../engraving-barline-spacing.test.ts) |
| rhythm-whole-note-alignment | 41 | Align a bar-length note with the first beat if another part plays shorter values in the same bar. | pass | [barline-score](../engraving-barline-spacing.test.ts) |
| spacing-system-signatures | 41 | Leave roughly one to one-and-a-half clear stave spaces between the clef, key and time signatures at a system opening. | pass | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-first-note | 42 | Give the first unaltered note the largest opening gap, roughly two spaces after a time signature and two-and-a-half after a clef or key signature alone. | pass | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-first-accidental | 42 | Pull an altered opening note slightly toward its preceding signature, leaving at least one stave space to the nearest accidental so that it reads with the note. | pass | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-accidental-compact | 42 | Keep accidentals close to their own heads or adjoining accidentals as far as the shapes allow without touching. | pending | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-mid-system-signatures | 42–43 | Leave a stave space after a changed clef and about two spaces after a mid-system key or time signature. | pending | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-barline-clearance | 42–43 | Allow one space on either side of a barline, retaining at least one space to stems even if an accidental or grace note needs to approach within half a space. | pass | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-inset-barline | 42 | When the final divider is inset from the stave end, allow roughly one stave space beyond it. | out of scope: the fixture format has no system-end layout with stave lines continuing beyond the terminal measure barline |  |
| spacing-grace-after-barline | 43 | A grace note may approach a barline in close setting if it leaves at least half a stave space of clearance. | pass | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-squeezed-symbols | 41 | In dense setting keep neighbouring independent characters clear, with about half a stave space of breathing room. | judged by eye | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-tight-symbols | 43 | In a dense passage, allow symbols such as inserted clefs and accidentals to come within half a stave space while remaining clear. | pass | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-single-accidental-rhythm | 43 | Keep equal-value intervals unchanged when one accidental fits within the ordinary spacing. | pass | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| spacing-multiple-accidental-rhythm | 43 | When multiple accidentals need extra room, widen the approach locally to preserve an even spread of signs. | judged by eye | [symbol-spacing](../engraving-barline-spacing.test.ts) |
| chord-one-stem | 47 | Join equal-duration notes in one voice to a common stem so the notes read as a single chord. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-string-mixed-durations | 47 | Bowed strings may show different durations on a single chord stem when only some pitches can be sustained. | out of scope: instrument-specific exception covered with triple and quadruple stops on p. 398 |  |
| chord-stem-extreme | 47–48 | Use the note farthest from the middle line to set a chord’s stem direction, pointing the stem toward the stave. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-stem-majority | 48 | When the outer pitches tie in distance from the middle line, point the stem away from the side with more heads. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-stem-balanced | 47–48 | A symmetrically balanced chord can use either stem direction, including a house convention for down-stems. | out of scope: either automatic direction satisfies the rule, so neither an exclusive default nor a rejection is warranted |  |
| chord-stem-context | 48 | A consistent stem direction within a short musical group can override the isolated preference of a chord. | judged by eye | [single-stem-chords](../engraving-chords.test.ts) |
| chord-adjacent-pair | 48–49 | Write an isolated second with the lower head left and the upper head right, even when the shared pitch changes sides on successive chords. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-adjacent-odd | 49 | Alternate an odd run of adjacent heads with most on the ordinary stem side, placing the lowest head left for up-stems and right for down-stems. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-adjacent-even | 49 | Start an even run of adjacent heads with the lowest head on the left and alternate regardless of stem direction. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-adjacent-with-gap | 49 | Preserve the layout of a second within a larger chord when forcing its outermost heads onto the ordinary side would reverse that second. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-voices-ordinary-alignment | 49 | Align the undisplaced heads of simultaneous adjacent-note chords in different voices to make their common onset clear. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-adjacent-offset | 49, 53 | When a tone or semitone separates the voices, shift the lower voice right and align the upper voice with an accompanying part. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-score-adjacent-alignment | 49 | Across staves, align adjacent-note chords by their undisplaced heads. | out of scope: the extension to score alignment is covered under vertical alignment on p. 490 |  |
| chord-adjacent-stemless | 50 | Displace adjacent whole heads to the same sides they would occupy with a stem, keeping the second readable. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-unison-single-stem | 50 | Show both notes of a same-voice perfect unison by placing a head on each side of their common stem. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-unison-single-stemless | 50 | Retain both side-by-side heads of a stemless perfect unison. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-altered-unison-order | 50–51 | In the normal layout, order altered unison heads by rising chromatic pitch and put the corresponding accidental before each head. | out of scope: compact shared-stem layout chosen after rendering comparison |  |
| chord-altered-unison-branches | 50–51 | Connect a displaced altered-unison head with a diagonal branch that clears the accidental and any flag or beam, leaving the main stem visible beyond the join. | out of scope: compact shared-stem layout chosen after rendering comparison |  |
| chord-altered-unison-layout-choice | 50–51 | Place the accidentals before the compact altered-unison heads and use a normal shared stem. | pass | [single-stem-chords](../engraving-chords.test.ts) |
| chord-cluster-attached | 51 | Attach every head of a stemmed cluster to the main stem or a branch so that its membership is unambiguous. | out of scope: compact shared-stem layout chosen after rendering comparison |  |
| chord-cluster-stemless-bracket | 52 | Enclose a stemless altered cluster with a square bracket to show that all heads sound together. | out of scope: the approved compact stemless layout omits the bracket |  |
| chord-cluster-stemless-alignment | 52 | Align a simultaneous part with the first head of a stemless altered cluster or with the implied stem position of an adjacent-note chord. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-stem-direction | 47, 52 | Use separate up-stems for the upper voice and down-stems for the lower voice, even when their rhythms differ or pitches cross. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-unison-stems | 52 | When two voices share a head at a unison, keep both opposing stems so the independent voices remain evident. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-black-unison | 52 | Two voices may share a black head at unison even when they have different durations. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-stemless-unison | 52 | Give each voice its own head at a stemless unison so both voices are visible. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-unlike-unison | 52–53 | Give unlike head types distinct positions at a unison, normally displacing the lower voice right. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-whole-clearance | 53 | Keep a whole head clear of the other voice’s stem so it cannot be read as a stemmed duration. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-offset-alignment | 53 | Align an accompanying part with the left-hand head of an offset unison or second, including either permitted whole-note ordering. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-voices-crossed-offset | 53 | Put the crossed down-stem part left and the up-stem part slightly right, so no head of one part sits on the other's and each stem stays distinct, with the other stave aligned to the left part. | pass | [double-stem-chords](../engraving-chords.test.ts) |
| chord-dotted-voice-exceptions | 53 | Reconsider the usual offset when only one of the competing voices is dotted. | out of scope: addressed with the dotted adjacent-note and unison cases on pp. 56–59 |  |
| chord-voices-overlapping-whole-values | 54 | Spell overlapping whole-note voices with tied stemmed values when needed to make each voice’s motion clear. | out of scope: rewriting authored durations and ties changes the source notation |  |
| chord-voices-crossed-adjacent | 54 | When undotted adjacent voices cross, put the down-stemmed part on the left to help the heads overlap. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-duration-size | 54 | Make duration dots larger than staccato dots so the two marks are easy to tell apart. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-head-gap | 54 | Keep a duration dot close to its head, with a typical clear gap of half a stave space. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-multiple-spacing | 54 | Keep successive dots on one note close together and evenly spaced. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-space-position | 54 | Centre a space note’s dot vertically in the same space. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-line-position | 54 | Place a line note’s dot in the space immediately above the line. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-ledger-position | 55 | Use the same space above an isolated ledger line for its note’s duration dot. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-flag-clearance | 55 | Keep an up-stem flag clear of the duration dot by moving the dot past the flag or lengthening the stem. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-chord-column | 55 | In an ordinary dotted chord, give each head a dot and place the dots in one column after the heads. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-chord-line-side | 55 | In a dotted second, move an upper line note’s dot up and a lower line note’s dot down to keep them clear of the adjacent head. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-chord-distinct-spaces | 55 | Use a different stave-space row for each dot in an ordinary chord, including through implied ledger spaces, so the dots cannot read as a multiplied duration. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-chord-centred | 56 | In a crowded chord, balance the dot column vertically around the noteheads. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-chord-dense-count | 56 | For a tightly packed chord whose full dot column would extend two stave spaces past a head, use the dot rows that cover the chord’s span. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-lower-voice-line | 56 | Put a lower voice’s dot below its line note in ordinary two-voice writing. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-adjacent-both-voices | 56–57 | When both adjacent parts are dotted, prefer a common column after both heads for compact layout or keep each dot near its own head. | pending | [duration-dots](../engraving-dots.test.ts) |
| dot-adjacent-upper-only | 56–57 | Keep a lone upper-voice dot beside its head. It may sit over the lower head or move outward to avoid resembling an articulation. | pending | [duration-dots](../engraving-dots.test.ts) |
| dot-adjacent-lower-only | 56 | In ordinary adjacent two-voice writing, keep the lone lower-voice dot on its own side of the other head. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-voice-chord-columns | 57 | Arrange the dots of each adjacent-note chord in its own vertical column in two-voice music. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-crossed-stem-clearance | 57 | When crossed parts have just one dotted value, keep the other voice’s stem out of the gap from the dotted head to its dot. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-crossed-both-parts | 57 | Dotted crossed parts can share a dot column to the right of both heads in cramped settings. | pending | [duration-dots](../engraving-dots.test.ts) |
| dot-crossed-adjacent-upper | 57 | For a dotted up-stem voice crossing an adjacent undotted voice, put the dotted head first with its dot between the heads. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-crossed-adjacent-lower | 58 | For a dotted down-stem line note crossing an adjacent up-stem note, use the space above the dotted head to keep the dot clear. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-crossed-chords | 58 | In overlapping dotted chords, normally keep each dot column beside its own heads. In cramped setting both sets may follow the chords. | pending | [duration-dots](../engraving-dots.test.ts) |
| dot-unison-one-stem | 58 | Give the heads of a same-stem unison one dot apiece on different space rows. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-unison-pronged | 58 | Prefer a dot beside each head of a pronged chord and allow a shared column when space is limited. | pending | [duration-dots](../engraving-dots.test.ts) |
| dot-unison-shared-head | 58 | Show one visible duration dot when two equally dotted voices share the same head at unison. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-unison-whole-heads | 59 | When both voices have a dotted whole note at unison, retain both heads and a separate dot for each. | pass | [duration-dots](../engraving-dots.test.ts) |
| dot-unison-unlike-heads | 59 | For unlike dotted values in unison, keep a dot beside each head when space allows and use a compact placement when needed. | pending | [duration-dots](../engraving-dots.test.ts) |
| dot-unison-one-voice | 59 | A dotted and undotted unison may share a head when the rhythms are obvious. Separate the heads when needed for clarity. The upper voice usually goes first, and putting the undotted head first is also permitted. | pending | [duration-dots](../engraving-dots.test.ts) |

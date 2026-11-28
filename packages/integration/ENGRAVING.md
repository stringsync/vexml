# Engraving

Behind Bars (Elaine Gould) supplies defaults **only when MusicXML leaves the
choice open**. Explicit `<stem>`, `default-y`, or `placement` still wins.
Each fixture leaves the attribute under test unset.

Follow the [engraving skill](../../skills/engraving/SKILL.md). Extracts land
their rules, fixtures and checks, compare Behind Bars, MuseScore, Verovio and
OSMD on each rule with `vex rules strip`, and record what each draws in the
rule note. A measured check settles a rule when the renderers reach consensus
(unanimous, Behind Bars + MuseScore, or Behind Bars + at least two digital
renderers) or a standing house style applies (`vex rules settle`): a pass is
approved, a failure is rejected and linked to its fix. Rules whose renderers
genuinely disagree, judged by eye, or flagged subjective go to the user as
review questions, and a disagreement is decided there before any fix is filed.
Unambiguous fixes with passing checks, clean lint, 5 or fewer moved snapshots,
and no moved non-engraving fixtures merge directly; wider, subjective, or
treatment-choice fixes pause on a Ready to merge card carrying their rules
strip and record approval in `__reviews__/` before merging. Each section's
checkpoint then surfaces only rules still undecided, rejected, or unexpectedly
changed by later fixes. Never copy Gould's prose or examples into this public
ledger or its original fixtures.

## Format and status key

Each section's rules live in its own file under [ledger/](ledger), linked from
the Sections table below. Read only the file for the section you work on.
Each extracted rule gets a row there: a stable kebab-case Id, a print Page, a
one-sentence paraphrase in Rule, a Status and a Link (relative to the section
file) to its test, task or decision. It also gets a rule note,
[rules/<id>.md](rules), holding the rule, its test case, what each renderer
draws and its checks in our own words, which a review shows beside its screenshot. IDs remain
stable if sections move. An empty section table is deliberately unextracted,
not a claim that the section contains no rules. A section's Status below stays
`pending` while its extract is incomplete. Do not invent rule rows from
contents headings. `vex rules sync` writes each row's Status and each
section's Rules count.

Statuses: `pending`, `pass`, `fails → #task`, `judged by eye`, and
`out of scope: <why>` (for example, copyist advice or an unsupported instrument).
A screenshot alone is not an automated geometry check. Record the reason for
each visual judgment or exclusion and link its evidence.

## Sections

Ranges follow contents boundaries at roughly 30 pages. They cover the main
instructional text; chapter-opening pages carry forward into the next range
where applicable. Front matter, Appendix (651–654), Further Reading,
acknowledgements and Index are outside this rule sweep. Print pages 241–242 and
477–478 introduce parts rather than notation rules. Contents OCR omits the page
for “Accidentals in double-stemmed writing”; use print page 90.

The pilot is **Ground rules: stems, beams and rests**, print **5–37** (#3549).
The harness example in [engraving.test.ts](engraving.test.ts) is scaffolding,
not an extracted Gould rule.

| Pages | Section | Status | Rules |
| --- | --- | --- | --- |
| 5–37 | [Ground rules: stems, beams and rests (pilot)](ledger/005-ground-rules-stems.md) | done | 86 |
| 38–59 | [Barlines, spacing, chords and dots](ledger/038-barlines-spacing-chords.md) | done | 92 |
| 60–89 | [Ties and accidentals](ledger/060-ties-accidentals.md) | done | 106 |
| 90–122 | [Double-stemmed accidentals, keys, dynamics and articulation](ledger/090-doublestemmed-accidentals-keys.md) | done | 129 |
| 123–148 | [Grace notes, arpeggios, trills, glissandos and vibrato](ledger/123-grace-notes-arpeggios.md) | done | 68 |
| 149–177 | [Metre and rhythmic grouping](ledger/149-metre-rhythmic-grouping.md) | done | 38 |
| 178–206 | [Metre indications and tuplets](ledger/178-metre-indications-tuplets.md) | done | 66 |
| 207–240 | [Tuplet ratios and repeat signs](ledger/207-tuplet-ratios-repeat.md) | done | 64 |
| 243–268 | [Woodwind and brass](ledger/243-woodwind-brass.md) | done | 40 |
| 269–300 | [Percussion](ledger/269-percussion.md) | done | 53 |
| 301–328 | [Keyboard conventions](ledger/301-keyboard-conventions.md) | done | 41 |
| 329–348 | [Keyboard layouts, piano and organ](ledger/329-keyboard-layouts-piano.md) | pending | 32 |
| 349–370 | [Harp](ledger/349-harp.md) | done | 34 |
| 371–390 | [Classical guitar](ledger/371-classical-guitar.md) | done | 40 |
| 391–423 | [Strings: playing techniques and harmonics](ledger/391-strings-playing-techniques.md) | done | 49 |
| 424–448 | [Strings: scordatura and ensembles; vocal underlay](ledger/424-strings-scordatura-ensembles.md) | pending | 47 |
| 449–476 | [Vocal notation and choral writing](ledger/449-vocal-notation-choral.md) | done | 59 |
| 479–510 | [Preparing materials and score conventions](ledger/479-preparing-materials-score.md) | pending | 0 |
| 511–538 | [Score order, grouping and stave allocation](ledger/511-score-order-grouping.md) | pending | 0 |
| 539–561 | [Band scores, reductions and part preparation](ledger/539-band-scores-reductions.md) | pending | 0 |
| 562–588 | [Part notation, cues and percussion](ledger/562-part-notation-cues.md) | pending | 0 |
| 589–606 | [Electroacoustic music](ledger/589-electroacoustic-music.md) | pending | 0 |
| 607–628 | [Rhythmic independence and synchronization](ledger/607-rhythmic-independence-synchronization.md) | pending | 0 |
| 629–650 | [Proportional spacing, approximate pitch and choices](ledger/629-proportional-spacing-approximate.md) | pending | 0 |

## Decisions

- Stemless altered unisons use compact heads with all accidentals on the left, omitting the bracket (chord-cluster-stemless-bracket).

The user's calls, in full, are in [ledger/decisions.md](ledger/decisions.md).
Read an entry there when it names a rule you work on. One line each:

- 2026-11-27, `grace-align-separate-staves`: close separate-stave grace notes up to their following main note (#4527).
- 2026-11-27, `gliss-same-letter-direction`: follow Behind Bars, angling same-letter glissando lines toward the raised or lowered pitch (#4513).
- 2026-11-27, `grace-slur-clear-ledger`, `trill-accidental-mark`: approved as drawn.
- 2026-11-27, `grace-slur-clear-accidental`, `grace-slur-chord-top`: rejected; curve the slur above, as Behind Bars does (#4505).
- 2026-11-25, `chord-altered-unison-layout-choice`: compact heads, grouped accidentals, and a normal shared stem.
- 2026-11-25, `clef-g-f-on-line`: approved again after the re-render.
- 2026-11-25, `beam-direction-majority`: approved after #3857's fix.
- 2026-11-25, `ledger-shared-voices`: approved again after the re-render.
- 2026-11-25, `rest-level-with-pitches`: approved as drawn.
- 2026-11-24, `stem-thickness`: Bravura proportions, 1.2px stems against 1.3px stave lines (#3581).
- 2026-11-24, `tail-ledger-clear`: middle line for 8th/16th, +¾ space per extra tail.
- 2026-11-24, `ledger-shared-voices`: approved as drawn.
- 2026-11-24, `stem-length`: approved as drawn.
- 2026-11-23, `clef-g-f-on-line`: approved as drawn.
- 2026-11-23, `stem-middle-line`: neighbours, then beat, then down (#3582).
- 2026-11-23, `beam-direction-majority`: majority wins unless the minority reaches ~1½ spaces further (#3857).
- 2026-11-25, `barline-repeat`: use a one-third-space stroke gap.
- 2026-11-25, `dot-adjacent-both-voices` (crossed second): align both dots in one column after both heads on separate spaces, following MuseScore.
- 2026-11-25, `dot-unison-unlike-heads` (unlike dotted unison): give each head its own dot, with the second head clear of the first dot.
- 2026-11-25, `dot-crossed-both-parts` (crossed third): place the down-stem head left and align both dots in one column after both heads.
- 2026-11-25, `dot-crossed-stem-clearance`, `dot-crossed-both-parts` (crossed thirds and wider): heads diagonally side by side, one head apart, with outer stems; a lone upper dot sits over the lower head, its stem just past the dot.
- 2026-11-25, `dot-unison-one-voice` (dotted-plus-plain unison): keep the upper voice left and clear the lower head and stem past an upper-voice dot.
- 2026-11-25, `rhythm-whole-bar-note`: keep a lone whole-bar note at beat 1, following MuseScore and Verovio.
- 2026-11-25, `spacing-first-note`: keep the Behind Bars 2–2½ space opening gap, following MuseScore.
- 2026-11-25, `spacing-mid-system-signatures`: keep the Behind Bars space after a changed clef and two after a mid-system key or time.
- 2026-11-26, `spacing-barline-clearance`: keep a full space from a barline to the next accidental, following Behind Bars and Verovio over MuseScore.
- 2026-11-26, `dot-crossed-chords`: one dot column after both crossed chords, following MuseScore (fix #4341).
- 2026-11-26, `dot-unison-pronged`: stack an altered unison's dots vertically, following MuseScore and Verovio (fix #4342).
- 2026-11-26, pp. 40–48 spacing and chord-stem judgement rules: vexml's renders approved as drawn.
- 2026-11-26, `dot-adjacent-upper-only`: a lone upper dot may sit above the lower head, as drawn.
- 2026-11-26, `dot-adjacent-both-voices`: touching heads, both dots in one column after them, following MuseScore (fix #4340).
- 2026-11-26, `dot-unison-unlike-heads`, `dot-unison-one-voice`: unison heads touch and all dots follow both heads, following MuseScore (fix #4343), replacing the 2026-11-25 calls.
- 2026-11-26, `dot-crossed-both-parts`: crossed dotted thirds and fourths sit one head apart with outer stems, as Behind Bars p. 57 shows.
- 2026-11-26, ties and slurs: where a treatment is open, follow the recorded house style (compact bows, clean endpoints, opposite-way splits on seconds/moving pairs).
- 2026-11-26, `tie-flatter-than-slur`: vexml's original slur bow (~½ stave-space deeper than a tie) approved as drawn, replacing the #4352 calls.
- 2026-11-26, `tie-depth`, `tie-apex-off-line`: vexml's ¾-space ties approved as drawn.
- 2026-11-26, `tie-ends-centre`, `tie-chord-same-space`: tie ends between head centre and inner edge, each in its head's space (fix #4349).
- 2026-11-26, `tie-articulation-clear`: ties stay clear of articulation, moved below (fix #4351).
- 2026-11-26, `tie-mixed-stems-middle-line`, `tie-adjacent-away`: both ties down between opposite stems; a second's ties curve apart (fix #4350).
- 2026-11-26, `tie-system-break-ends`, `tie-system-break-direction`: a broken tie stops before the barline, resumes after the signatures, keeps its direction (fix #4353).
- 2026-11-26, `tie-system-break-symmetric`, `tie-chord-even`, `tie-same-direction-apart`: approved as drawn.
- 2026-11-26, `tie-double-stem-chords`: curve all ties on a double-stemmed chord in its part’s direction, following Behind Bars (fix #4354).
- 2026-11-26, `tie-overlap-no-stem-between`: place the tied overlapping head right of the other voice so its stem clears the tie, following Behind Bars (fix #4355).
- 2026-11-26, `tie-overlap-both-parts`: approved as drawn (C5 up, G4 down), following Behind Bars.
- 2026-11-26, `tie-ledger-no-intersect`: curve a tie clear of another part’s ledger lines, following Behind Bars (fix #4357).
- 2026-11-26, `tie-unison-no-cross`: stack chord-unison ties (two up, two stacked down) with no overlap, following OSMD (fix #4358).
- 2026-11-26, `tie-unison-double-one`, `tie-unison-diff-durations`, `tie-unison-dotted-right`: share single-tied unison head, keep voice 1 left, dot after touching heads, upper ties up and lower down (fix #4354).
- 2026-11-26, `tie-moving-away-from-change`, `tie-moving-alternate-sides`: approved as drawn, following MuseScore, Verovio and OSMD.
- 2026-11-26, `tie-moving-passage-consistent`: approved as drawn (alternating up, down, up), following MuseScore, Verovio and OSMD.
- 2026-11-26, `tie-moving-clear-accidental`: curve a tie away from an added note’s accidental, following Behind Bars (fix #4359).
- 2026-11-26, `tie-chord-with-slur`: place ties and slurs in opposite directions on chords, following Behind Bars (fix #4360).
- 2026-11-26, `tie-open-lv`: draw a short open tie curving down to the right for laissez vibrer, following Behind Bars and MuseScore (fix #4361).
- 2026-11-26, `acc-tie-barline`, `acc-cautionary-round`, `acc-cautionary-chord-pairs`, `acc-editorial-square`: approved as drawn.
- 2026-11-26, `acc-tie-system-break`: repeat a tied accidental at the start of a new system, following Behind Bars and Verovio (fix #4363).
- 2026-11-26, `acc-small-above`: draw an accidental-mark with no ornament small above its note, following Behind Bars and Verovio (fix #4364).
- 2026-11-26, `acc-ornament-upper-lower`: an ornament’s upper-note accidental above it, lower-note one below (fix #4365).
- 2026-11-26, `acc-chord-seventh`: align both flats and sharps a seventh apart, keeping vexml as drawn (matching MuseScore, Verovio and OSMD), replacing the earlier Behind Bars offset call.
- 2026-11-26, `acc-chord-fourth-fifth-overlap`: tuck two flats a fifth apart (~0.56 spaces) and keep two naturals a fourth apart clear (fix #4367), replacing the earlier overlap-both call.
- 2026-11-26, `tie-adjacent-away`: keep G4 down and A4/C5 up, with cleaner endpoints and vertical spacing on chords with a second (fix #4394).
- 2026-11-26, `tie-chord-with-slur`: curve both the chord tie and slur downward (nested), matching MuseScore, Verovio and OSMD (fix #4400), replacing the #4360 call.
- 2026-11-26, pp. 60–89 checkpoint: approved all 28 other reviewed tie and accidental rules after the section’s fixes; only `tie-adjacent-away` (#4394) and `tie-chord-with-slur` (#4400) need follow-up fixes.
- 2026-11-26, `tie-chord-with-slur`: approved the #4400 fix, the chord tie and slur both curving down with the slur below the tie.
- 2026-11-26, `slur-break-open-tilt`: keep vexml as drawn, using a level open arc at a system break rather than tilting towards the next pitch (#4434).
- 2026-11-27, `acc-chord-adjacent-order`: keep conventional outer-closest order on chords with adjacent altered notes.
- 2026-11-27, `key-change-cancel-order`: when cancellation is unspecified, print the new key alone for the four-flats-to-three-sharps system opening and the three-to-one-sharp mid-system change (fix #4467 for the mid-system case).
- 2026-11-27, `slur-chord-adjacent-centre`: approved as drawn, with the slur ends aligned with the upper heads of the two down-stem chords.
- 2026-11-27, `artic-adjacent-chord-centre`: approved as drawn, with each staccato dot centred on the upper head of its down-stem chord.
- 2026-11-27, `hairpin-stop-short-of-barline`: stop the crescendo at the barline when it leads into a nearby downbeat dynamic (fix #4469).
- 2026-11-27, `acc-chord-octave-offset`: keep the current accidental columns. The three sharps occupy separate columns, ordered nearest to farthest as upper F♯, G♯, lower F♯. The E♭ octave shares a column.
- 2026-11-27, `acc-double-stem-adjacent-reverse`: keep the higher accidental closer even when the higher voice sits to the left.
- 2026-11-27, `acc-double-stem-altered-unison`: separate the heads and place each accidental beside its own voice, following Behind Bars (fix #4470).
- 2026-11-27, `dyn-multi-char-align-last`: keep `ppp` centred under its note with a clear gap before the following `ff`.
- 2026-11-27, `hairpin-system-break`: give the incoming crescendo a clearly open left end and stop it at the first note. Leave the outgoing diminuendo visibly open at the right (fix #4471).
- 2026-11-27, `slur-break-ends`: keep the level arc and end directly above the closing barline with visible clearance (fix #4479).
- 2026-11-27, `slur-tenuto-centre-head`: honour the tenutos’ above placement and centre the slur tips on the noteheads (fix #4480).
- 2026-11-27, pp. 90–122 checkpoint: all 12 outstanding rules reviewed. Fixes #4467, #4469, #4470, #4471, #4479 and #4480 track the six rules that require changes.
- 2026-11-27, `beam-feathered-converge`: keep vexml as drawn, drawing converging and spreading feathered beams matching Behind Bars.
- 2026-11-27, `beam-rest-stemlets`: draw short stemlets under beams extending across outer rests, following Behind Bars and Verovio (fix #4529).
- 2026-11-27, `time-dual-interchangeable`: keep dual time signatures side by side and centre the second signature inside its parentheses (fix #4530).
- 2026-11-27, pp. 149–177 checkpoint: all 3 open rules reviewed; fixes #4529 and #4530 track the two required changes.
- 2026-11-27, `tuplet-ratio-note-value`: keep note-value glyphs beside tuplet ratio numerals, sized smaller and centred neatly in the bracket gap clear of staff and stems (fix #4542).
- 2026-11-27, `tuplet-across-barline`: draw one unbroken tuplet bracket spanning across the barline with equal start/end margins (fix #4544).
- 2026-11-27, `tuplet-nested-outer-bracket`, `tuplet-nested-opposite-sides`: enclose outer nested tuplet in a bracket on the stem side with inner brackets on the notehead side by default (fix #4545).
- 2026-11-27, `tuplet-nested-same-side`: approved as drawn.
- 2026-11-27, `tremolo-two-note-octave-between`: keep same-direction upward stems with beams above the stave on wide-interval two-note tremolos, matching MuseScore and Verovio.
- 2026-11-27, `repeat-beat-slash`: draw clean 1-, 2-, and 3-slash beat repeats centred in the middle two stave-spaces with no leftover stems or beams (fix #4543).
- 2026-11-27, `repeat-barline-signature-order`: give forward-repeat signatures breathing room and place post-repeat clef, key cancellation, and time signature all after the backward repeat barline (fix #4549).
- 2026-11-27, `segno-coda-sign-position`: centre segno and coda signs above the stave horizontally over their opening barlines (fix #4550).
- 2026-11-27, pp. 207–240 checkpoint: all 9 open rules reviewed. Fixes #4542, #4543, #4544, #4545, #4549, and #4550 track the 7 rules needing changes.
- 2026-11-27, `metre-alternating-plus`, `metre-alternating-hyphen`, `metre-mixed-denominators`: keep vexml as drawn, joining alternating time signatures with `+` or a centred hyphen.
- 2026-11-27, `tempo-align-repeat`: align a tempo marking with a system-opening repeat sign itself, keeping mid-system repeat barlines aligned with the first note (fix #4538).
- 2026-11-27, `tempo-equation-over-barline`: centre the `=` sign of a tempo equation over the barline, following Behind Bars (fix #4540).
- 2026-11-27, `pause-fermata-tremolo`: centre a fermata over the beams of a two-note tremolo, following Behind Bars (fix #4539).
- 2026-11-27, `pause-fermata-inside-slur`: keep a mid-phrase fermata inside its slur with clear separation, following Behind Bars and OSMD (fix #4541).
- 2026-11-27, `tuplet-bracket-long-final`: keep the traditional bracket stop at the final written notehead, matching MuseScore, Verovio, and OSMD.
- 2026-11-27, `tuplet-bracket-angle-unbeamed`: keep horizontal unbeamed brackets and match reference renderers on above/below placement (fix #4546).
- 2026-11-27, `tuplet-bracket-angle-beamed`: slope beamed tuplet brackets parallel to single beams and keep opposing beams horizontal, following Behind Bars and Verovio (fix #4547).
- 2026-11-27, `tuplet-side-ledger-lines`: place high ledger-line tuplet brackets on the notehead side above the notes, following Behind Bars and OSMD (fix #4548).
- 2026-11-27, `tuplet-side-mixed-stems`: keep mixed-stem tuplet brackets above the stave clear of hairpins below, as drawn.
- 2026-11-27, `tuplet-bracket-slur-nesting`: nest tuplet brackets outside shorter slurs and inside longer slurs without intersection, following Behind Bars and Verovio (fix #4551).
- 2026-11-27, `tuplet-bracket-partial-beam`: draw a bracket enclosing only the tuplet notes inside a longer beam, following Behind Bars and Verovio (fix #4552).
- 2026-11-27, `tempo-equation-arrows`, `tempo-equation-complex`: keep outward tempo-equation arrows and complex tied/tuplet metric modulations as drawn.
- 2026-11-27, pp. 178–206 checkpoint: all 16 open rules reviewed; 7 approved as drawn and 9 tracked by fixes #4538, #4539, #4540, #4541, #4546, #4547, #4548, #4551, and #4552.
- 2026-11-27, `vocal-spoken-single-line`: align single-line spoken noteheads directly on the line with upward stems and lyrics below, following Behind Bars (fix #4731).
- 2026-11-27, `choral-stage-directions-above-tempo`: keep `Allegro molto` above stage text and stack character directions above `pp` dynamics, following MuseScore, Verovio, and OSMD (fix #4732).
- 2026-11-27, pp. 449–476 checkpoint: both open renderer-disagreement rules reviewed and tracked by fixes #4731 and #4732 (alongside existing consensus fixes #4723, #4724, #4725, #4726, and #4729).
- 2026-11-27, `harp-pedal-diagram-placement`: place grand-staff harp pedal diagrams between the two staves when room allows, following Behind Bars (fix #4733).
- 2026-11-27, `harp-chord-strum-arrow`, `harp-damp-sign-glyph`: keep vexml as drawn, matching Behind Bars.
- 2026-11-27, `harp-damp-between-staves`: place grand-staff harp damping signs between the two staves and downbeat damping signs just after the barline, following Behind Bars (fix #4734).
- 2026-11-27, pp. 349–370 checkpoint: all 4 open harp rules reviewed; 2 approved as drawn and 2 tracked by fixes #4733 and #4734.
- 2026-11-28, `vocal-hyphen-across-rests`: approved the #4723 fix, centring hyphens across short rests and placing separated hyphens before and after extended rest passages.
- 2026-11-28, `vocal-falsetto-harmonic-circle`: approved the #4725 fix drawing bare `<harmonic/>` as an ordinary notehead with a harmonic circle above it.
- 2026-11-28, `perc-rim-shot-noteheads`: draw a distinct circled black notehead for `<notehead>circled</notehead>` rather than falling back to an oval head, following Behind Bars (fix #4747).
- 2026-11-28, pp. 269–300 checkpoint: reviewed the 1 open percussion rule (`perc-rim-shot-noteheads`, fix #4747); section marked done alongside fixes #4719, #4720, and #4721.
- 2026-11-28, `string-open-middle-chord`: keep the open-string circle above the whole chord, matching MuseScore and Verovio.
- 2026-11-28, `string-fingering-stack-order`: stack single-voice string fingering above articulations and below bowing signs and string indications without collisions, following Behind Bars (fix #4748).
- 2026-11-28, `string-double-stop-both-open`, `string-harmonic-double-stop-circles`: keep stacked open-string and natural-harmonic circles vertically above double- and triple-stops as drawn, matching Behind Bars and Verovio.
- 2026-11-28, `string-double-stop-one-open`, `string-harmonic-lower-chord-below`: place open-string and natural-harmonic circles below the stave when only the lower note of a single-stemmed chord is marked, following Behind Bars (fix #4749).
- 2026-11-28, `string-double-stop-adjacent-open`: align an adjacent-second open-string circle horizontally with its own notehead, following Behind Bars (fix #4750).
- 2026-11-28, `string-bowing-lower-voice-below`: place lower-voice bowing marks below the stave and inverted when two voices share a stave, following Behind Bars and Verovio (fix #4751).
- 2026-11-28, `string-harmonic-diamond-hollow`, `string-harmonic-artificial-chord`: keep touched-pitch natural and artificial harmonic diamond noteheads hollow at all durations with no harmonic circle, following Behind Bars (fix #4752).
- 2026-11-28, pp. 391–423 checkpoint: all 10 open strings rules reviewed; 3 approved as drawn and 7 tracked by fixes #4748, #4749, #4750, #4751, and #4752 (alongside #4730 and landed #4722).
- 2026-11-28, `woodwind-double-harmonic-circles`: keep vexml as drawn, stacking two small open harmonic circles vertically above each double-harmonic chord, following Behind Bars and Verovio.
- 2026-11-28, `woodwind-fingering-holes`: keep vexml as drawn, placing open, closed, and half-filled hole circles directly above or below each note, following Behind Bars.
- 2026-11-28, pp. 243–268 checkpoint: both open rules (`woodwind-double-harmonic-circles`, `woodwind-fingering-holes`) approved as drawn; `wind-breath-mark-tick` remains tracked by fix #4718.
- 2026-11-28, `guitar-string-circled-position`: place unplaced circled string numbers below the stave for low notes and above for high notes, following Behind Bars (fix #4761).
- 2026-11-28, `guitar-dotted-slur-ligado`, `guitar-audible-glissando-text`: keep dotted two-voice *ligado* slurs above the beam (matching MuseScore and Verovio) and straight glissando lines without `gliss.` text (matching Verovio and OSMD).
- 2026-11-28, `guitar-strum-arrow-above`, `guitar-damp-all-above`, `guitar-harmonic-diamond-duration`, `guitar-harmonic-combined-stem`, `guitar-scordatura-above-first-stave`: approved as drawn.
- 2026-11-28, `guitar-harmonic-artificial-two-heads`: keep touched-pitch artificial harmonic diamond noteheads open across all note values, following Behind Bars (folded into fix #4752).
- 2026-11-28, pp. 371–390 checkpoint: all 9 open classical guitar rules reviewed; 7 approved as drawn, `guitar-string-circled-position` tracked by fix #4761, and `guitar-harmonic-artificial-two-heads` folded into #4752 (alongside #4755).
- 2026-11-28, `kbd-fingering-inner-voice`: place upper-voice fingering above the stave and lower-voice fingering below its notes or stem ends, following Behind Bars (fix #4762).
- 2026-11-28, `kbd-fingering-substitution`: keep vexml as drawn, joining finger-substitution numerals horizontally with a dash, matching Behind Bars.
- 2026-11-28, `kbd-three-voices-same-stem-offset`: displace the lower same-direction voice to the right in three-voice staves, following Behind Bars and Verovio (fix #4763).
- 2026-11-28, `kbd-three-voices-flag-beam-right`: keep vexml as drawn, displacing a beamed same-direction voice to the right clear of the lower stem, matching Behind Bars and OSMD.
- 2026-11-28, `kbd-cross-staff-tuplet-unbeamed`: keep vexml as drawn, using default single-stave stems with a horizontal bracket above the upper stave, matching Verovio.
- 2026-11-28, `kbd-cross-staff-tuplet-beamed`: place cross-staff beamed triplet beams above the upper stave with bare numerals above each beam, following OSMD (fix #4771).
- 2026-11-28, `kbd-slur-cross-staff-beam`: place cross-staff beamed slurs on the majority-note side clear of the beams, following Behind Bars (fix #4772).
- 2026-11-28, pp. 301–328 checkpoint: all 7 open keyboard rules reviewed; 3 approved as drawn and 4 tracked by fixes #4762, #4763, #4771, and #4772 (alongside #4756, #4757, and #4758).

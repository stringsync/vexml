# Engraving

Behind Bars (Elaine Gould) supplies defaults **only when MusicXML leaves the
choice open**. Explicit `<stem>`, `default-y`, or `placement` still wins.
Each fixture leaves the attribute under test unset.

Follow the [engraving skill](../../skills/engraving/SKILL.md). Extracts land
their rules, fixtures and checks, then new in-scope rules appear in the
persistent review inbox. Submitted verdicts record decisions and identify fix
work. Fixes require a proposal and finished-result approval. Their Ready to
merge card links to a fix inbox showing the targeted rules and every rule
whose fingerprint differs from `main`. Never copy Gould's prose or examples
into this public ledger or its original fixtures.

## Format and status key

Each extracted rule gets a stable kebab-case Id, a print Page, a one-sentence
paraphrase in Rule, a Status and a Link to its test, task or decision, plus a
rule note, [rules/<id>.md](rules), holding the rule, its test case and what to
look for in our own words, which the review inbox shows beside its screenshot. IDs remain
stable if sections move. Empty tables below are deliberately unextracted, not
claims that a section contains no rules. Section status stays `pending` while
its extract is incomplete. Do not invent rule rows from contents headings.

Statuses: `pending`, `pass`, `fails → #task`, `judged by eye`, and
`out of scope: <why>` (for example, copyist advice or an unsupported instrument).
A screenshot alone is not an automated geometry check. Record the reason for
each visual judgment or exclusion and link its evidence.

## Section map

Ranges follow contents boundaries at roughly 30 pages. They cover the main
instructional text; chapter-opening pages carry forward into the next range
where applicable. Front matter, Appendix (651–654), Further Reading,
acknowledgements and Index are outside this rule sweep. Print pages 241–242 and
477–478 introduce parts rather than notation rules. Contents OCR omits the page
for “Accidentals in double-stemmed writing”; use print page 90.

The pilot is **Ground rules: stems, beams and rests**, print **5–37** (#3549).
It spans clefs and noteheads as context, stems (13), tails (15), beams (17),
ledger lines (26), octave signs (28, 32), and rest symbols (34).

The harness example in [engraving.test.ts](engraving.test.ts) uses an original
ascending-note fixture to demonstrate observable geometry plus a screenshot.
It is scaffolding, not an extracted Gould rule or a pilot completion claim.

## 5–37: Ground rules: stems, beams and rests (pilot)

Status: pending

The pilot lands one rule end to end, the shape every later row follows: an original
fixture that leaves the attribute unset, a check that measures the render's ink masks
([engraving-ink.ts](engraving-ink.ts)) in quarter stave-spaces, and a screenshot of the
fixture. The rest of the section is extracted one chunk per task in lane 281.

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |
| stem-length | 14 | A stem is 3½ stave-spaces from the centre of its notehead. | pending | [stem-length](engraving-stem-length.test.ts) |

## 38–59: Barlines, spacing, chords and dots

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 60–89: Ties and accidentals

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 90–122: Double-stemmed accidentals, keys, dynamics and articulation

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 123–148: Grace notes, arpeggios, trills, glissandos and vibrato

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 149–177: Metre and rhythmic grouping

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 178–206: Metre indications and tuplets

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 207–240: Tuplet ratios and repeat signs

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 243–268: Woodwind and brass

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 269–300: Percussion

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 301–328: Keyboard conventions

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 329–348: Keyboard layouts, piano and organ

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 349–370: Harp

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 371–390: Classical guitar

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 391–423: Strings: playing techniques and harmonics

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 424–448: Strings: scordatura and ensembles; vocal underlay

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 449–476: Vocal notation and choral writing

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 479–510: Preparing materials and score conventions

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 511–538: Score order, grouping and stave allocation

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 539–561: Band scores, reductions and part preparation

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 562–588: Part notation, cues and percussion

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 589–606: Electroacoustic music

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 607–628: Rhythmic independence and synchronization

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## 629–650: Proportional spacing, approximate pitch and choices

Status: pending

| Id | Page | Rule | Status | Link |
| --- | --- | --- | --- | --- |

## Decisions

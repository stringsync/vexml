---
name: diff-measures
description: Compare two music notation screenshots at specific measure numbers and verbalize granular visual differences, including vexml integration test screenshots and __diffs__ images with old/diff/new vertical sections.
---

# Describe Measure Screenshot Differences

Use this skill when the user asks you to compare, inspect, verbalize, summarize, or describe visual differences between music notation screenshots, especially vexml integration screenshots in `tests/integration/__screenshots__` or diff screenshots in `tests/integration/__diffs__`.

The goal is to give a human or coding agent factual, measure-specific observations they can act on. Do not decide which image is correct unless the user explicitly asks. State what each image shows.

## Required Inputs

You MUST identify the specific measure number or measure range before comparing.

- If the user names a measure, use that measure.
- If the user names multiple measures or the engraving spans multiple measures, compare that measure range.
- If there is exactly one measure visible, you may assume that single measure is the target.
- Otherwise, ask the user for the measure number before proceeding.

Do not provide a vague page-level or system-level comparison when the target measure is unknown.

## Image Naming

Always explicitly name the compared images as `image1` and `image2`.

- `image1` is always the first image provided or mentioned.
- `image2` is always the second image provided or mentioned.
- If the comparison uses sections within one `tests/integration/__diffs__` image, name the first relevant section `image1` and the second relevant section `image2` according to the user's requested comparison.

## Special Handling for `tests/integration/__diffs__`

Screenshots in `tests/integration/__diffs__` are usually a single image containing three vertical sections:

1. old
2. diff
3. new

Pay close attention to the user's request:

- If they ask to compare old vs new, use the old section as `image1` and the new section as `image2` unless they explicitly provide a different ordering.
- If they ask to describe the diff section itself, distinguish between visual facts in the diff section and visual facts in old/new.
- If they ask to compare new against another screenshot, use the new section as whichever image corresponds to the user's ordering, and compare it with the other screenshot.
- Do not assume the requested comparison is always old vs new.

When referencing a section, be explicit, for example: "`image1` is the old section of the diff screenshot. `image2` is the new section of the diff screenshot."

## Workflow

1. Confirm the target measure number or range.
2. Identify `image1` and `image2` according to the image naming rules.
3. Zoom in or crop mentally/tool-assisted to the target measure(s) in each screenshot before comparing.
   - Inspect only the relevant measure(s), plus immediately adjacent notation if needed to understand an engraving that crosses barlines, such as slurs, ties, beams, hairpins, or lyrics.
   - If using browser or image tools, zoom/crop enough that noteheads, stems, articulations, slurs, beams, accidentals, lyrics, and staff spacing are readable.
4. Compare granular notation and engraving facts. Prefer concrete observations over interpretation.
5. Rank each remarkable difference with one of these severities:
   - `minor`: small visual or spacing difference that probably does not change musical meaning and is unlikely to block acceptance by itself.
   - `moderate`: noticeable engraving difference, alignment issue, attachment issue, or missing/extra visual element that may matter for output quality.
   - `major`: difference that changes apparent musical content, removes/adds important notation, attaches notation to the wrong object, or substantially degrades readability.
6. If there are no remarkable differences in the target measure(s), say so directly.

## What to Compare

Within the target measure(s), check at least these categories when visible:

- notes, rests, chords, notehead shapes, dots, grace notes
- pitch placement on staff and ledger lines
- duration appearance, beams, flags, tuplets, stems, stem direction, stem length
- accidentals, key signatures, clefs, time signatures when relevant to the measure
- barlines, repeats, endings, measure widths, system breaks
- slurs, ties, phrase marks, glissandi, arpeggios, brackets
- articulations, ornaments, fermatas, technical marks
- dynamics, hairpins, expressions, tempo text, rehearsal marks
- lyrics, syllable alignment, hyphens, melismas
- staff spacing, vertical collisions, horizontal alignment, object attachment points
- visibility differences such as missing, extra, shifted, clipped, overlapped, or mirrored elements

## Output Format

Use one of these formats.

If there are no remarkable differences:

```markdown
In measure <n>, `image1` and `image2` have no remarkable differences.
```

or

```markdown
In measures <n> to <m>, `image1` and `image2` have no remarkable differences.
```

If there are differences:

```markdown
In measure <n>, `image1` and `image2` have the following differences.

- [<minor|moderate|major>] `image1` shows <specific fact>. `image2` shows <specific fact>.
- [<minor|moderate|major>] `image1` has <specific fact>. `image2` has <specific fact>.
```

or

```markdown
In measures <n> to <m>, `image1` and `image2` have the following differences.

- [<minor|moderate|major>] `image1` shows <specific fact>. `image2` shows <specific fact>.
- [<minor|moderate|major>] `image1` has <specific fact>. `image2` has <specific fact>.
```

Keep each bullet granular. Prefer several small factual bullets over one broad summary bullet.

Good bullets:

- `[major] \`image1\` has a slur from the first notehead to the third notehead. \`image2\` has no slur in that position.`
- `[moderate] \`image1\` has a slur that is concave up. \`image2\` has a slur that is concave down.`
- `[moderate] \`image1\` has a slur ending near a note stem. \`image2\` has the slur ending near the notehead.`
- `[minor] \`image1\` places the dynamic slightly left of the notehead. \`image2\` centers the dynamic under the notehead.`

Avoid vague bullets:

- `The layout is different.`
- `The slur is wrong.`
- `The rendering changed.`

## Tone and Limits

- Be factual and concise.
- Use `image1` and `image2` in every difference bullet when practical.
- Do not infer implementation causes from the screenshot alone.
- Do not describe unrelated measures unless the visual difference crosses into or depends on the target measure.
- If the screenshot resolution prevents certainty, say what is uncertain and what would need a closer crop or higher-resolution image.

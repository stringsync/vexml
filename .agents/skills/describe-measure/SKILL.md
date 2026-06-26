---
name: describe-measure
description: Describe or compare music notation screenshots at specific measure numbers, including one-image descriptions, vexml integration screenshots, and __diffs__ images with old/diff/new vertical sections.
---

# Describe Measure Screenshot

Use this skill when the user asks you to inspect, describe, summarize, compare, or verbalize measure-specific notation in one or more music notation screenshots, especially vexml integration screenshots in `tests/integration/__screenshots__` or diff screenshots in `tests/integration/__diffs__`.

The goal is to give a human or coding agent factual, measure-specific observations they can act on. Do not decide which rendering is correct unless the user explicitly asks. State what the screenshot or compared scopes show.

## Required Inputs

You MUST have at least one image, screenshot, screenshot section, or diff artifact to inspect. If no image or image path is provided, ask for one before proceeding.

You MUST identify the specific measure number or measure range before describing or comparing.

- If the user names a measure, use that measure.
- If the user names multiple measures or the engraving spans multiple measures, inspect that measure range.
- If there is exactly one measure visible in the provided image or relevant section, you may assume that single measure is the target.
- Otherwise, ask the user for the measure number before proceeding.

Do not provide a vague page-level or system-level description when the target measure is unknown.

## Scope Mapping

A scope is an image, screenshot, section, or comparison target that you inspect.

- If there is only one scope, do **not** declare a `scope1` / `scope2` mapping. Describe the target measure directly.
- If there are two or more scopes, explicitly map the compared material from the calling context as `scope1`, `scope2`, and additional scopes if needed before describing differences.
- `scope1` is the first image, screenshot, section, or comparison target provided or mentioned by the user.
- `scope2` is the second image, screenshot, section, or comparison target provided or mentioned by the user.
- If the comparison uses sections within one `tests/integration/__diffs__` image, map the relevant sections to scopes according to the user's requested comparison.
- State comparison mappings explicitly in plain language, for example:
  - "`scope1` is the first image you provided. `scope2` is the second image you provided."
  - "`scope1` is the old section in the diff image you provided. `scope2` is the new section in the diff image you provided."
  - "`scope1` is the new section in the diff image you provided. `scope2` is the separate baseline screenshot you provided."

## Special Handling for `tests/integration/__diffs__`

Screenshots in `tests/integration/__diffs__` are usually a single image containing three vertical sections:

1. old
2. diff
3. new

Pay close attention to the user's request:

- If they ask to compare old vs new, use the old section as `scope1` and the new section as `scope2` unless they explicitly provide a different ordering.
- If they ask to describe only one section, such as the diff section itself or the new section, treat that as a single scope and do not declare `scope1` / `scope2` mappings.
- If they ask to describe the diff section itself, distinguish between visual facts in the diff section and visual facts from old/new only when that context is needed.
- If they ask to compare new against another screenshot, use the new section as whichever scope corresponds to the user's ordering, and compare it with the other screenshot.
- Do not assume the requested task is always old vs new comparison.

When referencing a section, be explicit, for example: "the old section of the diff screenshot," "the diff section," or "the new section of the diff screenshot."

## Workflow

1. Confirm that at least one image, screenshot, screenshot section, or diff artifact is available.
2. Confirm the target measure number or range.
3. Determine whether the task has one scope or multiple scopes.
   - For one scope, do not declare scope mappings.
   - For multiple scopes, explicitly map `scope1`, `scope2`, and any additional scopes according to the scope mapping rules.
4. Inspect the target measure(s) in each relevant scope.
   - Inspect only the relevant measure(s), plus immediately adjacent notation if needed to understand an engraving that crosses barlines, such as slurs, ties, beams, hairpins, or lyrics.
   - If using browser or image tools, zoom/crop enough that noteheads, stems, articulations, slurs, beams, accidentals, lyrics, and staff spacing are readable.
5. Describe granular notation and engraving facts. Prefer concrete observations over interpretation.
6. For comparisons, rank each remarkable difference with one of these severities:
   - `minor`: small visual or spacing difference that probably does not change musical meaning and is unlikely to block acceptance by itself.
   - `moderate`: noticeable engraving difference, alignment issue, attachment issue, or missing/extra visual element that may matter for output quality.
   - `major`: difference that changes apparent musical content, removes/adds important notation, attaches notation to the wrong object, or substantially degrades readability.
7. If a comparison has no remarkable differences in the target measure(s), say so directly.

## What to Inspect

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
- visibility issues such as missing, extra, shifted, clipped, overlapped, or mirrored elements

## Output Format

Use one of these formats.

### One scope

Do not start with a `scope1` / `scope2` mapping.

```markdown
In measure <n>, the screenshot shows <concise factual overview>.

- <specific notation or engraving fact>.
- <specific notation or engraving fact>.
```

or

```markdown
In measures <n> to <m>, the screenshot shows <concise factual overview>.

- <specific notation or engraving fact>.
- <specific notation or engraving fact>.
```

If the user asks for notable issues in a single scope, use severity labels for the issues:

```markdown
In measure <n>, the screenshot has the following notable issues.

- [<minor|moderate|major>] <specific visual or engraving issue>.
- [<minor|moderate|major>] <specific visual or engraving issue>.
```

### Multiple scopes

Always start by stating the scope mapping explicitly, using the actual calling context.

If there are no remarkable differences:

```markdown
`scope1` is <explicit first image/section mapping>. `scope2` is <explicit second image/section mapping>.

In measure <n>, `scope1` and `scope2` have no remarkable differences.
```

or

```markdown
`scope1` is <explicit first image/section mapping>. `scope2` is <explicit second image/section mapping>.

In measures <n> to <m>, `scope1` and `scope2` have no remarkable differences.
```

If there are differences:

```markdown
`scope1` is <explicit first image/section mapping>. `scope2` is <explicit second image/section mapping>.

In measure <n>, `scope1` and `scope2` have the following differences.

- [<minor|moderate|major>] `scope1` shows <specific fact>. `scope2` shows <specific fact>.
- [<minor|moderate|major>] `scope1` has <specific fact>. `scope2` has <specific fact>.
```

or

```markdown
`scope1` is <explicit first image/section mapping>. `scope2` is <explicit second image/section mapping>.

In measures <n> to <m>, `scope1` and `scope2` have the following differences.

- [<minor|moderate|major>] `scope1` shows <specific fact>. `scope2` shows <specific fact>.
- [<minor|moderate|major>] `scope1` has <specific fact>. `scope2` has <specific fact>.
```

Keep each bullet granular. Prefer several small factual bullets over one broad summary bullet.

Good one-scope bullets:

- `The measure contains four beamed eighth notes on the treble staff, with stems up and a single beam above the staff.`
- `The slur starts at the first notehead and ends at the third notehead, arching above the notes.`
- `[moderate] The dynamic marking overlaps the lower staff line and is hard to read.`

Good comparison bullets:

- `[major] \`scope1\` has a slur from the first notehead to the third notehead. \`scope2\` has no slur in that position.`
- `[moderate] \`scope1\` has a slur that is concave up. \`scope2\` has a slur that is concave down.`
- `[moderate] \`scope1\` has a slur ending near a note stem. \`scope2\` has the slur ending near the notehead.`
- `[minor] \`scope1\` places the dynamic slightly left of the notehead. \`scope2\` centers the dynamic under the notehead.`

Avoid vague bullets:

- `The layout is different.`
- `The slur is wrong.`
- `The rendering changed.`
- `The measure looks fine.`

## Tone and Limits

- Be factual and concise.
- Do not use `scope1` / `scope2` language for a single-scope description.
- For comparisons, use `scope1` and `scope2` in every difference bullet when practical.
- Do not infer implementation causes from the screenshot alone.
- Do not describe unrelated measures unless the visual detail crosses into or depends on the target measure.
- If the screenshot resolution prevents certainty, say what is uncertain and what would need a closer crop or higher-resolution image.

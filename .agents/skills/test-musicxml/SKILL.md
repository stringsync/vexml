---
name: test-musicxml
description: Add or update vexml MusicXML integration tests, validate screenshot output, implement rendering fixes, and selectively update baselines.
---

# Test MusicXML

Use this skill when adding or updating a `vexml` MusicXML rendering test case, especially when the work involves integration fixtures, screenshots, or baseline updates.

## Workflow

**Important:** Do not use `vex test --local` for MusicXML screenshot work. Always use the normal `vex test` commands shown below, plus selective `vex test --update <name>` only after reviewing the screenshot output. Do not add `--local` to any command in this workflow.

1. First, check whether an existing test in `tests/integration/` already covers the use case.
   - Inspect the relevant integration case definitions and existing files under `tests/integration/__data__/`.
   - Reuse or extend an existing case when that is the least surprising option.

2. If the use case is not already covered, add it to `tests/integration/__data__/` — preferably as a new measure inside the existing fixture for that category rather than as a brand-new file.

   **Bundle by category; treat each measure as a pseudo unit test.** A category fixture (e.g. `key.musicxml`, `time.musicxml`, `note.musicxml`, `slur.musicxml`) is one MusicXML document whose measures each isolate one variant of that category's behavior — the way a unit-test file holds many small cases. The measure is the unit of isolation, not the file. For example, `key.musicxml` proves a sharp key, a flat key, a mid-system key change, and a no-redraw continuation across M1-M3; `slur.musicxml` walks nine slur scenarios across nine measures. When adding a new variant of an already-covered category, append a measure to that category's fixture (and a `M<n>:` bullet to its comment) instead of creating a near-duplicate file. When you find existing same-category fixtures that each test one variant (e.g. `key_sharps` + `key_flats` + `key_change`), consolidate them into one.

   - **When bundling does NOT apply:** some things are fixed for a whole document and can't vary per measure — the `<part-list>` and each part's stave configuration (stave count, tab string count, braces). Those stay as separate `category_variant.musicxml` files. This is why `structure_*` (different part-lists) and `clef_*` (single stave vs grand staff vs 4-/6-line tab) are not bundled: each needs a different part/stave structure, not just a different measure. Rule of thumb: bundle what varies per measure (keys, meters, note/rest/accidental/articulation/beam/slur/tie/tuplet variants, voices); keep separate what needs a different part or stave layout.
   - Name a fixture that covers a whole category `category.musicxml` (e.g. `key`, `time`, `note`, `slur`). Use `category_variant.musicxml` only when different part/stave structures force more than one file in that category (e.g. `clef_tab_4_string`, `structure_grand_staff`). Categories: `structure`, `clef`, `key`, `time`, `note`, `rest`, `accidental`, `measures`, …; match the existing files in `tests/integration/__data__/`.
   - Register it in `tests/integration/render.test.ts` by adding `testCase('<filename>.musicxml', '<filename>.png')` to the `TEST_CASES` array. Pass any non-default `Config` as the third argument.
   - Keep `TEST_CASES` ordered by increasing rendering complexity. A `render` implementer should be able to build a correct renderer progressively by going through the tests in array order: basic structure before clefs, clefs before key/time signatures, simple notes/rests before accidentals, measures, beams, chords, ties/slurs, tuplets, articulations, voices, system layout, and broad stress cases. Insert new cases where they fit this progression; the array order is the only ordering — there is no numeric prefix. A bundled category fixture sits in its category's slot; let its most complex measure set the position.
   - Above each `testCase(...)` declaration, write a detailed comment describing what the screenshot should render: the clefs, staves, notes, and any distinctive notation or layout (positions, accidentals, beams, slurs, ledger lines, system breaks, …). Describe what is actually drawn so the comment alone tells a reader what to expect without opening the PNG. Match the descriptive style of the surrounding cases.
   - For cases spanning more than one measure, split the comment by measure for readability. Start with a one-line lead describing the global setup (stave/clef/time signature and any wrap behavior), then add one bulleted line per measure using a stable `M<n>:` marker (`M2-3:` for a span). Wrap continuation lines so they align under the bullet text. For multi-voice cases, use inline `V<n>` markers (e.g. `V1`, `V2`) inside each measure bullet. This keeps the comment scannable for humans and greppable for tools, with each `M<n>` mapping directly to a `<measure number="n">` in the fixture. Example:

     ```ts
     // Treble stave, 4/4: dotted-note variations.
     // - M1: dotted-quarter + eighth pairs (single dots).
     // - M2: double-dotted-quarter + sixteenth pairs (double dots).
     testCase('dotted_notes.musicxml', 'dotted_notes.png'),
     ```
   - Each measure should test only one thing. Vary one feature per measure and keep everything else stable (pitch, duration, clef); don't vary unrelated musical features within a measure unless the variation is part of what that measure is proving. The fixture as a whole deliberately spans many variants of its category — but each measure isolates exactly one.
   - Wrong pattern: when testing articulations, do not vary duration or pitch needlessly; use stable, boring notes unless pitch or duration affects the articulation behavior being tested.
   - Right pattern: when testing beams, varying pitch can be useful if the goal is to show how the beam renders under normal and extreme stem/ledger-line conditions. There should be a clear reason for every extra variation.
   - Keep each measure as small as practical while still demonstrating its variant, and the fixture as a whole no larger than its variants require.
   - Keep generated MusicXML fixtures as simple and barebones as possible; inspect nearby existing files and match their minimal structure and style.

3. Run the normal integration test command, not local mode:

   ```sh
   vex test
   ```

   Do not use `vex test --local`; it is not appropriate for validating or managing MusicXML screenshot baselines.

4. Interpret screenshot results carefully. Screenshot tests can fail or pass for two different reasons:
   - **False positive:** a newly added test may pass only because its first generated screenshot was automatically accepted as the baseline. In this state the test accepts any current rendering as correct, even if the rendering is visibly wrong. Leave a `TODO` comment above the `testCase(...)` explicitly calling out this failure mode, for example: `// TODO: False positive: this baseline was probably created from the current render, so it may be accepting an incorrect screenshot. Review the render, then run vex test <name> --update only after the image is confirmed correct.` If the user provides a golden-standard image for the case, confirm correctness by comparing it against vexml's render via the diff-measures subagent (see Describing Screenshot Diffs) before accepting. Eventually, the agent must run `vex test <name> --update` to intentionally accept the reviewed screenshot.
   - **True negative:** an existing screenshot test failed because a previously accepted baseline is no longer reproducible. Delegate the diff artifact to the diff-measures subagent (see Describing Screenshot Diffs), then use its summary to leave a `TODO` comment above the `testCase(...)` that describes the visual difference in plain language and links to the diff. Do not prescribe a fix unless the root cause is already clear. Prefer wording like: `// TODO: True negative: the accepted baseline shows <expected visual>, but the new render shows <actual visual>. Diff: <path-or-link>.`
   - In both cases, describe what a human should look for in the screenshot. Make the TODO specific enough that another agent can continue from it without opening unrelated files.
   - If the correct rendering is ambiguous, ask the user for feedback and include file links to the relevant screenshot diff or artifact.

5. Update the implementation in `src/` to fill the rendering gap.
   - Prefer a minimal, root-cause fix.
   - Keep changes consistent with the existing renderer and test patterns.

6. Run the normal test command again, not local mode:

   ```sh
   vex test
   ```

   Do not use `vex test --local` when checking rendering changes.

7. The target test may still fail. That is useful if it shows the implementation changed the rendered output.
   - For the target test file, inspect the new render and confirm it matches the intended rendering described by the relevant test comment or TODO.
   - Before updating any screenshot baseline, always perform the screenshot review checklist below.
   - If a `TODO` describes a false positive, keep it until the screenshot has been manually reviewed and intentionally accepted with `vex test <name> --update`.
   - If a `TODO` describes a true negative, keep it until the changed screenshot has been explained, fixed, or intentionally accepted.
   - Do not update baselines until you have evaluated the screenshot output.

## Screenshot Review Checklist

Always run this checklist before accepting or updating a screenshot baseline. Answer these questions from the actual screenshot or diff artifact, not from assumptions about the code:

- Is everything visible? Look for clefs, key signatures, time signatures, notes, rests, articulations, accidentals, ledger lines, beams, ties, slurs, lyrics, barlines, and other symbols that are cut off by the image bounds or page margins.
- Are the results sized appropriately for the render options and the fixture? The image should not look accidentally zoomed in, zoomed out, cropped, or padded with excessive empty space.
- Are musical glyphs clashing when they should not? Check collisions between noteheads, stems, beams, flags, accidentals, dots, rests, text, ties, slurs, clefs, key signatures, time signatures, and neighboring staves/measures.
- Given the render options, does the music feel too cramped? Look for notation that is technically visible but hard to read because horizontal or vertical spacing is too tight.
- Given the render options, does the music feel too spaced out? Look for measures, systems, or glyphs that are spread so far apart that the fixture no longer demonstrates the intended behavior clearly.
- What does the test comment describe? Does the screenshot match that description, including the named clefs, staves, notes, rests, accidentals, beams, slurs, ledger lines, system breaks, and layout expectations?
- Are all expected musical elements present exactly once, with no obvious duplicates, missing glyphs, wrong glyphs, or stale artifacts from a previous render?
- Are stems, beams, flags, dots, accidentals, and rests positioned in musically plausible places relative to the staff and notes?
- If this is a diff, can you explain the visual change in plain language? If not, inspect the artifacts more carefully before updating the baseline.
- If any answer is uncertain, do not update the baseline yet. Add or keep a `TODO` that names the uncertainty and links to the screenshot or diff artifact.

8. If the target render passes the screenshot review checklist, update only that baseline:

   ```sh
   vex test --update <name>
   ```

   Where `<name>` is the test title — the screenshot filename passed as the second argument to `testCase()` in `tests/integration/render.test.ts` (helper in `tests/testing/test-case.ts`), e.g. `clef_treble.png`. The pattern matches by prefix, so `clef_treble` also matches.

9. Validate that there are no regressions.
   - Run `vex test` again after the selective baseline update.
   - Per project rules, also run `vex fix` after code changes.
   - If you deleted any integration test cases, run `vex test --clean` globally to remove orphaned screenshot baselines. Do not target a single test when cleaning deleted cases.
   - If regressions appear, eagerly add or list `TODO` comments for each regression using the false-positive or true-negative language from step 4. Produce each plain-language visual difference via the diff-measures subagent (see Describing Screenshot Diffs). Include that difference and the relevant diff path or artifact link.
   - Do not update the whole suite by default. Create a plan for each regression and explain whether it is expected or unexpected.

## Describing Screenshot Diffs

Whenever you need to verbalize a screenshot difference — a regression diff artifact in `tests/integration/__diffs__`, or a comparison of vexml's current render against a golden-standard image the user provided (common for new test cases) — delegate the comparison to a subagent so the pixel-level detail stays out of the main context.

- Spawn a `general-purpose` (or `claude`) subagent. Tell it to read and follow `.agents/skills/diff-measures/SKILL.md`; subagents cannot invoke skills directly, so it must apply the skill from that file.
- Give it the image path(s). For a `__diffs__` artifact, tell it the image has old / diff / new vertical sections. For a golden-standard comparison, give it both the vexml render and the golden image and state which is which.
- Tell it which measure(s) to target. For a regression diff, point it at the measure(s) the diff band highlights and let it infer the range. For a golden-standard comparison, name the measure(s) under review.
- The agent returns a severity-ranked difference list. Surface that summary and use it for the relevant `TODO`; do not re-inspect the raw images yourself.

## Baseline Update Guidance

Avoid running `vex test --update` for the whole suite unless the change is intentionally global and every affected render has passed the screenshot review checklist. Prefer one-by-one baseline updates after confirming why each render changed.

Never use `vex test --local` as a substitute for review or baseline management; it can hide the behavior this workflow is meant to validate.

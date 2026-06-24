---
name: test-musicxml
description: Add or update vexml MusicXML integration tests, validate screenshot output, implement rendering fixes, and selectively update baselines.
---

# Test MusicXML

Use this skill when adding or updating a `vexml` MusicXML rendering test case, especially when the work involves integration fixtures, screenshots, or baseline updates.

## Workflow

1. First, check whether an existing test in `tests/integration/` already covers the use case.
   - Inspect the relevant integration case definitions and existing files under `tests/integration/__data__/`.
   - Reuse or extend an existing case when that is the least surprising option.

2. If the use case is not already covered, add a focused MusicXML document to `tests/integration/__data__/`.
   - Name the file `category_variant.musicxml`: a category (`structure`, `clef`, `key`, `time`, `note`, `rest`, `accidental`, `measures`, …) then a short variant. Match the existing files in `tests/integration/__data__/`.
   - Register it in `tests/integration/render.test.ts` by adding `testCase('<filename>.musicxml', {})` to the `TEST_CASES` array, in the position that reads in logical order (the array order is the only ordering — there is no numeric prefix). Pass any non-default `RenderOptions` as the second argument; they are encoded into the screenshot name.
   - Keep the fixture as small as practical while still demonstrating the behavior.
   - Keep generated MusicXML fixtures as simple and barebones as possible; inspect nearby existing files and match their minimal structure and style.

3. Run:

   ```sh
   vex test
   ```

4. Assert that the new or existing test produces the wrong output in `__screenshots__`.
   - Inspect the generated diff or screenshot artifact.
   - Make a note of the expected output; this expectation is the guiding success criterion for the implementation work.
   - If the test is erroneously passing because the current screenshot baseline is wrong, add a `TODO` comment above that test case explaining what must change for the screenshot to be correct.
   - Use this comment anatomy: `// TODO: Expected: <content>. Actual: <content>.`
   - The `Expected` content should describe the intended correct render. The `Actual` content should describe the current incorrect render.
   - Compare `Actual` against the relevant artifact in `tests/integration/__screenshots__/` as a double check before using it as the work queue item.
   - Treat these comments as pragmatic TODOs: they should be specific enough to guide the implementation and easy to remove once satisfied.
   - If the correct rendering is ambiguous, ask the user for feedback and include file links to the relevant screenshot diff or artifact.

5. Update the implementation in `src/` to fill the rendering gap.
   - Prefer a minimal, root-cause fix.
   - Keep changes consistent with the existing renderer and test patterns.

6. Run:

   ```sh
   vex test
   ```

7. The target test may still fail. That is useful if it shows the implementation changed the rendered output.
   - For the target test file, inspect the new render and confirm it matches the expected output from step 4.
   - When the screenshot satisfies the `TODO` expectation, remove the corresponding comment before updating the baseline.
   - Do not update baselines until you have evaluated the screenshot output.

8. If the target render is correct, update only that baseline:

   ```sh
   vex test --update <name>
   ```

   Where `<name>` is the test title — the screenshot filename: the MusicXML basename plus any encoded `RenderOptions` (e.g. `clef_treble.png`, or `clef_treble__width-500.png`), as registered by `testCase()` in `tests/integration/render.test.ts` (helper in `tests/testing/test-case.ts`). The pattern is the first positional argument and matches by prefix, so `clef_treble` also matches.

9. Validate that there are no regressions.
   - Run `vex test` again after the selective baseline update.
   - Per project rules, also run `vex fix` after code changes.
   - If you deleted any integration test cases, run `vex test --clean` globally to remove orphaned screenshot baselines. Do not target a single test when cleaning deleted cases.
   - If regressions appear, eagerly add or list `TODO` TODOs for each regression using the `Expected`/`Actual` anatomy. Include what changed, what the expected render should be, and the likely implementation area if known.
   - Do not update the whole suite by default. Create a plan for each regression and explain whether it is expected or unexpected.

## Baseline Update Guidance

Avoid running `vex test --update` for the whole suite unless the change is intentionally global and every affected render has been reviewed. Prefer one-by-one baseline updates after confirming why each render changed.

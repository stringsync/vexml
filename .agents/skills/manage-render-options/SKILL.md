---
name: manage-render-options
description: Add or change vexml RenderOptions (aka render options or render config) properties in src/render.ts, including docs, public option types, render wiring, integration coverage, and validation.
---

# Manage RenderOptions

Use this skill when adding, changing, or reviewing a property on `RenderOptions` in `src/render.ts`.

## Goal

A `RenderOptions` change is a public API change. Keep it small, documented, backwards-compatible by default, covered by an appropriate test, and safe for consumers to type-check from the package entrypoint.

## Public API Checklist

1. Update `src/render.ts`.
   - Add the property to `RenderOptions` as optional unless the user explicitly asks for a breaking change.
   - Use a clear camelCase name consistent with existing options such as `showPartLabels`, `measureNumbering`, `pxPerTick`, and `softmaxFactor`.
   - Document the property with a concise JSDoc comment.
   - Include the default behavior in the comment when the option has a default.
   - If the option accepts a fixed vocabulary, document the accepted values in the comment.

2. Keep option types public and importable.
   - Prefer primitives, literal unions, and TypeScript standard-library types when they are expressive enough.
   - If a custom type appears in `RenderOptions`, make sure it is exported from the package public API.
   - `src/index.ts` already re-exports `./render`, so a type exported from `src/render.ts` is public.
   - If the custom type lives in another module, either re-export it from `src/render.ts` or add an explicit export in `src/index.ts`, matching existing exports such as `FontConfig`, `FontOverride`, and `Layout`.
   - Do not expose an implementation-only type through `RenderOptions` unless it is intentionally becoming public API.

## Implementation Checklist

1. Trace option flow from `render(input, element, options)` through the relevant path.
   - Current paths include `renderMusicXML`, `renderMXL`, `renderMDoc`, `computeLayout`, and `drawScore`.
   - Pass only the needed data into lower layers unless existing patterns pass the whole `options` object.

2. Preserve existing behavior when the option is omitted.
   - Add explicit defaults where that makes behavior easier to reason about.
   - Avoid changing the default screenshot output unless the task intentionally changes defaults.

3. Avoid render-to-render state leaks.
   - If the option affects module-level, browser, or VexFlow global state, set or reset that state on every render.
   - Follow the font handling in `render()` as the model for resetting global VexFlow font state each call.

## Test Checklist

1. Add or update coverage in `tests/integration/render.test.ts` when the option affects rendered output.
   - Follow the existing `TEST_CASES` pattern: add a `testCase(musicXMLFilename, screenshotFilename, renderOptions?)` entry.
   - Pass the new non-default `RenderOptions` value as the third argument.
   - Add a descriptive comment immediately above the case. Existing comments describe the fixture, the option value, and the expected visible result.
   - Prefer reusing an existing MusicXML fixture when the option only changes rendering behavior.

2. Use existing prior art when choosing a test shape.
   - `structure_part_labels.musicxml` is reused for `showPartLabels` and `fonts.text` because it clearly exposes margin text.
   - `font_notation_petaluma.musicxml` exercises notation glyphs such as noteheads, clefs, rests, stems, and flags for `fonts.notation`.
   - `system_break.musicxml` is reused for `layout` and `measureNumbering` because it has multiple measures and systems, making layout and numbering behavior visible.
   - For a new option, choose the smallest existing fixture that makes the option's visual effect obvious. Create or extend a fixture only when no existing fixture demonstrates the behavior clearly.

3. Reference the `test-musicxml` skill for screenshot work.
   - When the change requires adding or updating MusicXML fixtures, screenshot cases, screenshot review TODOs, or baselines, load and follow the `test-musicxml` skill.
   - In particular, use `test-musicxml` for fixture reuse/bundling decisions, `render.test.ts` comment style, false-positive/true-negative TODOs, screenshot review, and selective baseline updates.
   - Do not duplicate the whole `test-musicxml` workflow here; this skill owns the `RenderOptions` API workflow and delegates detailed screenshot discipline to `test-musicxml`.

4. Consider non-screenshot tests if the option has non-visual behavior.
   - If an option only affects validation, type-level API, parsing, or error behavior, add the most targeted test available instead of forcing a screenshot test.
   - Still add screenshot coverage when the option changes visible rendering.

## Validation

After code changes, follow project rules:

```sh
vex fix
vex test
```

If screenshot baselines need to change, do not update the whole suite by default. Review the target output using the `test-musicxml` screenshot review checklist, then update only the intended baseline with the targeted `vex test --update <name>` workflow described there.

## Final Response Guidance

When reporting back to the user, mention:

- the `RenderOptions` property added or changed,
- any public types exported or re-exported,
- the test case or fixture added/updated,
- whether any screenshot baseline was reviewed or updated,
- the validation commands run and their results.

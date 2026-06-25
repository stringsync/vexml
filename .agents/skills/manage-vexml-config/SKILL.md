---
name: manage-vexml-config
description: Add or change vexml Config (aka render options or render config) properties in src/config.ts, including docs, public config type, render wiring, integration coverage, and validation.
---

# Manage render Config

Use this skill when adding, changing, or reviewing a property on `Config` in `src/config.ts`.

## Goal

A `Config` change is a public API change. Keep it small, documented, backwards-compatible by default, covered by an appropriate test, and safe for consumers to type-check from the package entrypoint.

`Config` is the fully-resolved configuration: every property is required. The public `render(input, element, config?)` accepts a `Partial<Config>` and merges it onto `DEFAULT_CONFIG`, so internal code (`computeLayout` and below) receives a complete `Config`. Adding a property therefore means adding it to the `Config` type *and* giving it a default in `DEFAULT_CONFIG`.

## Public API Checklist

1. Update `src/config.ts`.
   - Add the property to `Config` as a **required** field (no `?`). Backwards compatibility comes from the default, not from optionality.
   - Add the property's default value to `DEFAULT_CONFIG` (and, for a font field, `DEFAULT_FONT_CONFIG`). Omitting it from the caller's `Partial<Config>` must reproduce today's behavior.
   - Use a clear camelCase name consistent with existing fields such as `showPartLabels`, `measureNumbering`, `pxPerTick`, and `softmaxFactor`.
   - Document the property with a concise JSDoc comment.
   - Include the default behavior in the comment, matching the value in `DEFAULT_CONFIG`.
   - If the field accepts a fixed vocabulary, document the accepted values in the comment.

2. Keep config types public and importable.
   - Prefer primitives, literal unions, and TypeScript standard-library types when they are expressive enough.
   - If a custom type appears in `Config`, make sure it is exported from the package public API.
   - `Config` is exported from `src/index.ts`. A custom type used by `Config` must also be reachable: re-export it from `src/index.ts`, matching existing exports such as `FontConfig`, `FontOverride`, `Layout`, and `MeasureNumbering`.
   - Do not expose an implementation-only type through `Config` unless it is intentionally becoming public API.

## Implementation Checklist

1. Trace config flow from `render(input, element, config)` through the relevant path.
   - `render` resolves `Partial<Config>` to a full `Config` via `{ ...DEFAULT_CONFIG, ...config }`, then threads that `Config` through `renderMusicXML`, `renderMXL`, `renderMDoc`, `computeLayout`, and `drawScore`.
   - Lower layers receive a complete `Config` — read `config.yourField` directly; there is no `?.`/`?? default` at the point of use anymore. The default lives once, in `DEFAULT_CONFIG`.
   - Pass only the needed data into lower layers unless existing patterns pass the whole `config` object.

2. Preserve existing behavior when the field is omitted.
   - The default in `DEFAULT_CONFIG` is what makes an omitted field behave as before.
   - Avoid changing the default screenshot output unless the task intentionally changes defaults.

3. Avoid render-to-render state leaks.
   - If the field affects module-level, browser, or VexFlow global state, set or reset that state on every render.
   - Follow the font handling in `render()` as the model for resetting global VexFlow font state each call.

## Test Checklist

1. Add or update coverage in `tests/integration/render.test.ts` when the field affects rendered output.
   - Follow the existing `TEST_CASES` pattern: add a `testCase(musicXMLFilename, screenshotFilename, config?)` entry.
   - Pass the new non-default value as the third argument — a `Partial<Config>` with just the field under test.
   - Add a descriptive comment immediately above the case. Existing comments describe the fixture, the config value, and the expected visible result.
   - Prefer reusing an existing MusicXML fixture when the field only changes rendering behavior.

2. Use existing prior art when choosing a test shape.
   - `structure_part_labels.musicxml` is reused for `showPartLabels` and `fonts.text` because it clearly exposes margin text.
   - `font_notation_petaluma.musicxml` exercises notation glyphs such as noteheads, clefs, rests, stems, and flags for `fonts.notation`.
   - `system_break.musicxml` is reused for `layout` and `measureNumbering` because it has multiple measures and systems, making layout and numbering behavior visible.
   - For a new field, choose the smallest existing fixture that makes its visual effect obvious. Create or extend a fixture only when no existing fixture demonstrates the behavior clearly.

3. Reference the `test-musicxml` skill for screenshot work.
   - When the change requires adding or updating MusicXML fixtures, screenshot cases, screenshot review TODOs, or baselines, load and follow the `test-musicxml` skill.
   - In particular, use `test-musicxml` for fixture reuse/bundling decisions, `render.test.ts` comment style, false-positive/true-negative TODOs, screenshot review, and selective baseline updates.
   - Do not duplicate the whole `test-musicxml` workflow here; this skill owns the `Config` API workflow and delegates detailed screenshot discipline to `test-musicxml`.

4. Consider non-screenshot tests if the field has non-visual behavior.
   - If a field only affects validation, type-level API, parsing, or error behavior, add the most targeted test available instead of forcing a screenshot test.
   - Still add screenshot coverage when the field changes visible rendering.

## Validation

After code changes, follow project rules:

```sh
vex fix
vex test
```

If screenshot baselines need to change, do not update the whole suite by default. Review the target output using the `test-musicxml` screenshot review checklist, then update only the intended baseline with the targeted `vex test --update <name>` workflow described there.

## Final Response Guidance

When reporting back to the user, mention:

- the `Config` property added or changed and its `DEFAULT_CONFIG` default,
- any public types exported or re-exported,
- the test case or fixture added/updated,
- whether any screenshot baseline was reviewed or updated,
- the validation commands run and their results.

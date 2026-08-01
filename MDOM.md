# Migrating vexml onto `@stringsync/mdom` 0.2.0

This file is a work order for a coding agent. It assumes `@stringsync/mdom` has shipped
everything requested in `MDOM_UPGRADE_PROMPT.md`. Read that file first — it describes each
new API and why it exists. This file says what to change in **this** repo.

## The goal

**`MElement` and `MNode` disappear from vexml.** They are mdom's internals; every place
vexml touches them is a place vexml is re-implementing MusicXML semantics that now live in
mdom. When this is done:

```sh
grep -rn "MElement\|MNode" src cli          # → nothing
grep -rn "\.children\b\|\.child(\|\.childrenNamed(\|\.childrenOfType(\|\.closest(" src cli   # → nothing mdom-related
```

Roughly 700–800 lines come out. Do not add abstraction to replace them — delete the helper
and call the typed accessor inline where the helper had one caller.

## Rules

- **One section per commit.** Each is independently shippable and testable.
- **`vex fix` then `vex test` after every section.** Never batch.
- **Rendering output must not change**, with the two exceptions called out in §2 (mdom's
  slur pairing and beam grouping fixes). Where output *does* change there, it changes
  because vexml's workaround is being deleted in favor of mdom doing it right — verify with
  `vex render` and update snapshots deliberately, never blindly.
- **Delete, don't wrap.** If a local function becomes a one-line pass-through to an mdom
  accessor, inline it and delete the function. Move its doc comment onto the call site only
  if it says something mdom's own doc doesn't.
- **Keep the `ponytail:` comments** that document deliberate gaps in *vexml's* behavior
  (ignored `<extend>`, unhandled `sostenuto`, etc.). Delete the ones that only say "mdom has
  no accessor for this, so read the raw children" — those are now false.

---

## §1 — `src/engraving/score-reader.ts` (biggest win: ~300 of 1304 lines)

The file's whole first 250 lines are helper functions that exist only because mdom lacked
accessors. Most of it goes.

**Delete outright:**

| Symbol | Replaced by |
|---|---|
| `metronomesOf` | `direction.metronomes` |
| `beatUnitsOf` | `metronome.beatUnits` |
| `modulationNotesOf` | `metronome.relation` (`{left, right}` of `MetronomeNote`) |
| `placementOf` | `direction.placement ?? fallback` |
| `lineEndOf` | `bracket.lineEnd` |
| `soundsOf` | `measure.sounds` |

**Rewrite:**

- `keyIdentity` (~504) — the `childrenNamed('key-step'/'key-alter')` positional pairing
  becomes `key.alterations.map(a => \`${a.step}${a.alter}\`).join(' ')`. Keep the
  `rootNote`-first branch.
- `meterFloor` (~526) — `measure.getAttribute('implicit') === 'yes'` → `measure.isImplicit`.
- `midBarlinesOf` (~571) — the entire `measure.children` fold goes. Becomes
  `measure.barlines.filter(b => b.location === 'middle').map(b => ({ beat: b.measureBeat ?? 0, style: b.barStyle ?? 'regular' }))`.
  **Delete the `ponytail:` comment about `<backup>` not being rewound** — `measureBeat` uses
  `onsetOf`, which does rewind it. This is a behavior fix on multi-voice measures; check any
  fixture with a mid-measure divider and two voices.
- `midClefsOf` + `clefAtEndOf` (~608-703) — both become one-liners over
  `measure.clefChanges(staff)` and `measure.clefAtEnd(staff)`. Keep the `ponytail:` note
  about a change at beat 0 being dropped **only if** mdom's `clefChanges` still drops it;
  check its doc and re-verify against `navigation.musicxml`.
- `endBeatOf` (~1294) — vexml's version takes a `{chords}[]` shape used across the layout
  and draw passes, so keep it, but where it's called with a whole measure use
  `measure.endBeat`.
- `tempoOf` / `modulationOf` (~720-782) — read `direction.metronomes`, then
  `metronome.beatUnits` / `metronome.relation` / `metronome.parentheses` directly. The
  `<metronome-relation>` split and the beat-unit-dot positional walk both go away.
- `playbackTempoOf` / `swingOf` (~794-861) — `measure.sounds` covers both the in-direction
  and standalone-child positions, so the `soundsOf` generator goes and `swingOf` reads
  `sound.swing` directly (mdom normalizes `<straight/>` to 1:1 and `<swing-type>` to a beat
  fraction).
- `wordsOf` / `dynamicsOf` / `rehearsalsOf` / `navigationsOf` (~879-1026) — every
  `d.child('staff')?.text ?? '1'` becomes `d.staff`; every
  `childrenNamed('direction-type').flatMap(...)` chain becomes `d.dynamics` / `d.rehearsals`
  / `d.navigations`. `dynamicsOf`'s tag-name-is-the-text logic (including the
  `<other-dynamics>` case) is now `dynamics.marks`. Keep `isDynamicSpelling` /
  `DYNAMIC_GLYPHS` / `dynamicGlyphs` — those are vexml's SMuFL mapping, not mdom's job.
- `figuredBassesOf` (~971) — the `measure.children` walk and the manual next-note binding
  both go: `measure.figuredBasses.map(fb => ({ lead: fb.nextNote, figures: ... }))`. Keep
  `FIGURE_SIGN` (the sign→glyph table is vexml's) and the "drop a stack with no printable
  figure" rule.
- `directionLinesOf` (~1191) — delete the hand-rolled `open` map entirely. `Bracket` and
  `Dashes` are real spanners now, so this is
  `part.measures.flatMap(m => m.directions).flatMap(d => [...d.brackets, ...d.dashes])`,
  filtered to starts, each resolved through `.partner`. Keep the binding convention comment
  (both ends bind to `nextNote`, falling back to `previousNote` for a trailing stop) and the
  `LINE_TYPE_DASH` table.

**Keep unchanged:** `staffVoices`, `meterBeats`, `multiRestsOf` / `multiRestCountOf`,
`harmonyText`, `frameOf`, `harmoniesOf`, and every constant table
(`HARMONY_KIND_SUFFIX`, `HARMONY_ALTER`, `FIGURE_SIGN`, `DYNAMIC_GLYPHS`, `LINE_TYPE_DASH`).
These are vexml's rendering policy, correctly placed.

One typing fix while you're here: `harmoniesOf` returns `source: MElement` but iterates
`measure.harmonies`, which is already `Harmony[]`. Narrow it to `Harmony` — this is a stale
type, not a gap, and it's what forces `MElement` into `score-drawer.ts` and
`elements/chord-diagram.ts`.

---

## §2 — `src/engraving/spanner-builder.ts` (~110 lines, and two behavior changes)

**Delete `slurPartner`, `pairSlurs`, and the `SLUR_PARTNERS` WeakMap** (~1600-1700). mdom now
resolves note-attached spanners in onset order with the same-voice and oldest-open-start
tie-breaks, so `slur.partner` is correct across a `<backup>`. This also removes the only
`closest(Part)` call in the codebase.

⚠️ **Verify before deleting.** Render a cross-stave piano fixture (Dichterliebe, the Mozart
string quartet) and confirm mdom's pairing matches what `pairSlurs` produced. If it doesn't,
stop and report the divergence rather than accepting new output — the workaround exists
because the wrong answer draws two bars of ink across the page.

**Delete `tupletDisplay`** (~336) — `marker.child('tuplet-actual')?.child('tuplet-number')`
and the three `getAttribute` calls become `tuplet.actual`, `tuplet.normal`,
`tuplet.showNumber === 'both'`, `tuplet.bracket`. In `buildTuplets` (~540-600),
`tuplet.getAttribute('number')` → `tuplet.number` and
`tuplet.getAttribute('placement')` → `tuplet.placement`.

**`buildBeams`** — if mdom shipped `Measure.beamRuns()` with the "an `end` does not close the
run" semantics and `breaksAfter`, replace vexml's hand-rolled grouping with it. If mdom kept
only the old `groupBeams`, leave vexml's version and its comment in place.

⚠️ Same caution: this changes rendered beams on Guitar Pro exports (the
`begin,continue,end,continue,end` case). Verify against a fixture before updating snapshots.

**`s.getAttribute('line-type')`** (~1588) → `s.lineType`.

---

## §3 — `src/engraving/staves.ts` (~123 of 316 lines)

**Delete `hasStaffTuning` and rewrite `stringTuning`** (~11-78). Both walks
(`childrenNamed('attributes')` → `childrenNamed('staff-details')` →
`childrenNamed('staff-tuning')`) collapse into `part.getStaffTunings(staffNumber)`.
`stringTuning` becomes: get the tunings, invert line→string
(`midis[lineCount - t.line] = t.midi`), return. `midiOf` stays exported — other modules use
it — but `stringTuning` no longer computes MIDI by hand.

`isTabStaff` keeps its two-signal rule (TAB clef sign, **or** tunings + explicit
`<staff-lines>`) and the comment explaining why tuning alone isn't enough. Just source the
tunings and line count from `measure.getStaffTunings(staff)` and `measure.getStaveLines(staff)`.

**Delete `partGroupEntries` and `groupSymbol`** (~233-290). `score.partGroups` gives the
spans typed, with `depth`, `name`, `abbreviation`, and `barline` resolved. Rewrite:

- `partGroups(parts)` → filter `score.partGroups` to those with a drawable symbol spanning
  more than one part, map `'square'` → `'bracket'` (vexflow has no squared bracket — keep
  that comment), sort by depth.
- `barlineBreaks(parts)` → same two-pass join/break logic, over `score.partGroups` instead
  of the hand-walked entries. Keep the comment explaining why two passes (an outer `yes`
  must not erase an inner `no`).

Both functions currently take `Part[]`. They now need the `Score`. Change the signatures to
take `Score` and update callers — the `parts[0]?.parent?.child('part-list')` reach was only
ever a way to get there.

---

## §4 — `src/engraving/note-translator.ts` (~110 lines)

| Delete | Replace with |
|---|---|
| `noteheadFilled` (~220) | `note.notehead?.filled` |
| `displayKey` (~247) | `note.unpitched` / `note.restPosition` |
| `pitchedRestKey` (~289) | `note.restPosition` |
| `colorOf` (~400) | `.color` on the typed nodes (mdom normalizes `#AARRGGBB`) |
| `ornamentElements` (~582) | `note.ornaments` |
| `technicalElements` (~665) | `note.technicals` |
| `nonArpeggiateType` (~975) | `note.nonArpeggiate` |
| `syllableOf` (~1190) | `verse.runs` |

Details:

- `vexflowKey` (~256) — `note.child('unpitched')` → `note.unpitched`; build the key from
  `{step, octave}` directly.
- `isHidden` (~332) — `note.getAttribute('print-object') === 'no'` → `!note.printObject`.
- `applyNoteColors` (~415) — `colorOf(lead)` → `lead.color`,
  `colorOf(note.child('notehead'))` → `note.notehead?.color`,
  `colorOf(lead.child('stem'))` → `lead.stemColor`. Keep the comment about *why* this runs
  in the draw pass (beaming resets stem direction and rebuilds noteheads) and the one about
  vexflow's hardcoded stem `strokeStyle` — both are vexflow facts, still true.
- `addOrnaments` (~600-640) — iterate `note.ornaments` and switch on `o.ornamentType`
  instead of `element.tag`. `<tremolo>` reads `o.tremoloMarks`, `<accidental-mark>` reads
  `o.accidentalMark`. The document-order-matters logic (an accidental-mark attaches to the
  preceding ornament, first above / second below) stays exactly as is — mdom preserves the
  order, that's all it owes you.
- `addTechnicals` (~818-870) — iterate `note.technicals`; `element.tag` →
  `t.technicalType`, `element.getAttribute('placement')` → `t.placement`,
  `element.text` → `t.text`. `fingeringLabel` keeps its job (joining several
  `<fingering>`/`<pluck>` into one label) but reads `t.alternate` / `t.substitution`
  instead of `getAttribute`. It now takes `Technical[]`.
- `addAccidentals` (~1065) — `printed.getAttribute('editorial') === 'yes'` →
  `printed.editorial`. Delete the comment saying it has no mdom accessor.
- `addLyrics` / `syllableOf` (~1190) — `verse.runs.map(r => r.text || (r.kind === 'elision' ? ' ' : '')).join('')`.
  Keep the comment explaining why the space is the right default for an empty `<elision/>`.

---

## §5 — `src/engraving/draw-pass.ts` and `layout-planner.ts`

- `customKeyAccidentals` (draw-pass ~253-290) — the four `childrenNamed` calls and the
  positional index-pairing all collapse into `key.alterations`. Each entry already carries
  `step`, `alter`, `accidental`, and `octave`, so the body reduces to a map over
  `alterations` calling `keySignatureLine`. Delete the comment explaining the positional
  reading — that's mdom's contract now.
- `layout-planner.ts:550` — `p?.getAttribute('new-system') === 'no'` →
  `p?.systemBreak === 'no'`. Keep the surrounding comment; the tri-state distinction it
  explains is exactly why the accessor exists.
- `draw-pass.ts:782` — `harmonyTasks[].source: MElement` → `Harmony`, following §1's
  narrowing.
- Both files' `MElement` imports go.

---

## §6 — `src/elements/` (the public API surface)

This is where the leak is user-visible: `Element.getSources()` is part of vexml's public
interface and returns `readonly MElement[]`, so **every consumer of vexml inherits the
dependency on mdom's internals.**

Introduce one exported union in `src/elements/element.ts`:

```ts
import type { Harmony, Measure as MMeasure, Note as MNote, Part as MPart } from '@stringsync/mdom';

/** The mdom nodes a vexml Element can be built from. */
export type MSource = MNote | MMeasure | MPart | Harmony;
```

Then `abstract getSources(): readonly MSource[]`, and narrow each implementation to what it
actually returns:

| File | Was | Now |
|---|---|---|
| `note.ts:70` | `MElement[]` | `MNote[]` |
| `measure.ts:20` | `MElement[]` | `MMeasure[]` |
| `measure-box.ts:30` | `MElement[]` | `MMeasure[]` |
| `part.ts:17` | `MElement[]` | `MPart[]` |
| `system.ts:24` | `MElement[]` | `MMeasure[]` |
| `tab-position.ts:41` | `MElement[]` | `MNote[]` |
| `chord-diagram.ts:24,36` | `MElement` | `Harmony` |

`chord-diagram.ts`'s comment "the raw `<harmony>` MElement that produced this diagram (mdom
doesn't type harmony)" is wrong today — `Harmony` has existed since 0.1.x. Delete it.

Also:

- `note.ts:105-125` (`getGraceNotes`) — `this.deps.mnote.parent?.childrenOfType(MNote)` plus
  the backward walk becomes `this.deps.mnote.gracesBefore`, mapped through
  `this.deps.notes`. Keep the `ponytail:` note about a grace chord sounding as a run.
- `element-factory.ts:101,124` — `Map<MElement, Measure>` → `Map<MMeasure, Measure>`, and
  `rn.mnote.parent` → `rn.mnote.measure`. The null check on `.parent` goes away (`measure`
  is non-null on an attached note); keep the `measureByMMeasure.get(...)` miss check — a
  note whose column was never rendered still has no place in the index.

---

## §7 — `src/gaps.ts`

`insertGapMeasures` (~58-116) constructs a `Measure`, sets `number` by hand, `insertBefore`s
it, then copies clef/key/time per staff in a 25-line loop. Replace the body of the
`sorted.forEach` with:

```ts
const measure = part.insertMeasureAt(gap.beforeMeasureIndex + k, { number: '' });
const ref = part.measures[gap.beforeMeasureIndex + k + 1];
if (ref) {
  measure.copySignaturesFrom(ref);
}
```

Keep both `RangeError` validations (they're input validation at a public boundary), the
`beforeMeasureIndex + k` shift comment, and the comment explaining *why* the signatures are
copied — a gap before measure 0 sits before every declaration and would render a bare,
clefless stave. `gapDocumentIndexes` and `gapsByMeasureIndex` are untouched.

The `Measure` value import drops to a type import (or goes entirely).

---

## §8 — `cli/slice.ts` (~95 lines, and the last `MElement` import)

Delete `hoistAttributes`, `leadingAttributes`, `openAttributes`, `sortChildren`, and the
`CARRIED` / `GLOBAL` / `ATTRIBUTE_ORDER` tables. All of it is
`first.materializeSignatures()`.

`sliceMusicXML` becomes:

```ts
for (const part of doc.score.parts) {
  const measures = part.measures;
  const [first] = measures.filter((m) => wanted.has(m.number));
  if (!first) {
    throw new Error(`part ${part.id} has no measures matching "${spec}"`);
  }
  first.materializeSignatures();
  for (const measure of measures) {
    if (!wanted.has(measure.number)) {
      measure.remove();
    }
  }
}
```

Keep the doc comment's promise that spanners are deliberately left half-open — that's still
vexml's choice.

`cli/slice.test.ts` currently asserts on raw structure
(`measure.child('attributes')?.childrenNamed('key')`, `children.map(c => c.tag)`). Rewrite
those assertions against typed accessors — `measure.getKey()`, `measure.getClef()`,
`measure.getTime()`, `measure.getStaffTunings()`. The child-ordering test (line ~148) should
assert the serialized XML round-trips through `vex validate` rather than inspecting tag
order, since ordering is now mdom's invariant to hold, not vexml's to check.

---

## §9 — tests

- `src/elements/chord-diagram.test.ts:24` and `element-factory.test.ts:44` both do
  `measures[0]?.children.find(c => c instanceof MElement && c.tag === 'harmony')`. That's
  `measures[0].harmonies[0]`. Drop the `MElement` imports.
- `src/elements/measure.test.ts:51` and `measure-box.test.ts:58` assert
  `getSources()[0]?.tag === 'measure'`. With §6's narrowing, assert identity against the
  known mdom measure instead — stronger, and doesn't reach for `.tag`.
- `src/engraving/fonts.test.ts` uses `.tag` on DOM nodes, not mdom. Leave it.

---

## Order of work

1. §6 (types only, no behavior) — unblocks narrowing everywhere else.
2. §1, §3, §4, §5 — pure accessor swaps, no output change. Snapshot-clean.
3. §7, §8 — structural ops. `vex validate` the CLI output before and after.
4. §2 last, alone, with its own render verification. This is the only section that
   intentionally changes what's drawn.

After each: `vex fix`, `vex test`. Use `vex test --update` only when you have confirmed via
`vex render` that the new output is correct, and say in the commit message which fixtures
changed and why.

## Deliverable

Report: lines removed per file, the exact set of snapshots updated (with the musical
justification for each), and — if any accessor in `MDOM_UPGRADE_PROMPT.md` turned out to be
missing, lossy, or wrong in practice — what it should have been. That feedback is worth more
than the migration.

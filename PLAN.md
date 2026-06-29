# PLAN.md — Pointer events, layers, and decorations

> **This is a live checklist.** It is updated continuously as the feature is built — items
> get checked off as they land, and notes are added when decisions change. When the feature
> is fully fleshed out and accepted, this file is deleted. If you are reading this, the work
> is still in progress.

## Goal

Let callers interact with a rendered score: subscribe to pointer/scroll/resize events, hit-test
to vexml-owned target objects (`Note` / `Measure` / `TabPosition`), decorate notes (color / halo
toggles), and add their own drawing layers. Callers are coupled **only** to vexml types — never to
`@stringsync/mdom`.

## Final public API (exported from `src/index.ts`)

- `render(input: string | Blob, container: HTMLDivElement, config?): Promise<Score>` (was: canvas)
- `Rect` (geometry, now public via `Bounded`)
- `Bounded { rect; getBoundingClientRect() }`
- `Toggle<T> { on(value); off(); active }`
- `Note` (Bounded; `type`, `isChordMember`, `getChordSiblings`, `getPitch`, `getBeats`, `isGrace`,
  `getMeasure`, `getTabPosition`, `color: Toggle<string>`, `halo: Toggle`)
- `Measure` (Bounded; `type`)
- `TabPosition` (Bounded; `type`, `getString`, `getFret`, `getNote`)
- `PointerTarget = Note | Measure | TabPosition`
- `Layer { ctx; dispose() }` (NO canvas, NO clear)
- `LayerKind = 'viewport' | 'content'`
- `EventListenable<M>` (interface for add/removeEventListener)
- `Score` (EventListenable<ScoreEventMap>; `scroll`, `addLayer`, `removeLayer`, `dispose` — NO clearHighlights)
- `ScoreEventMap` + event payload types

## Invariants

- [ ] No `@stringsync/mdom` type appears in the public surface.
- [ ] Rects are stored in score space; crop/scroll/zoom applied only at the boundary.
- [ ] Anything a caller uses is exported from `src/index.ts`.
- [ ] `vex fix` and `vex test` pass at the end of every phase.

## Testing approach (per the Java-y DI request)

Every seam is an interface with a production class and a **separate fake class** (not a bun mock)
that fulfills it. Inject fakes in unit tests. Seams: `Decorator`, `HitTester`, the event bus,
coordinate transform. Fakes live beside the tests that use them.

---

## Phase 1 — Model (`targets.ts` + `targets.test.ts`) ✅ DONE

- [x] `Bounded`, `Toggle` interfaces
- [x] `Decorator` interface (the decoration seam) + `ColorToggle` / `HaloToggle` implementers
      (no callbacks-to-constructors — interface/implementer throughout)
- [x] `Note` over mdom (geometry + `Decorator` injected): `getPitch`, `getBeats`, `isGrace`,
      `isChordMember`, `getChordSiblings`, `getMeasure`, `getTabPosition`, `color`, `halo`
- [x] `Measure`
- [x] `TabPosition`: `getString`, `getFret`, `getNote`
- [x] cross-links resolve through `NoteLookup` / `TabLookup` interfaces (a Map implements them) —
      single-phase construction, no thunks; `Note -> Measure` is a direct ref
- [x] `PointerTarget` union
- [x] `Viewport` seam added (coordinate authority) so `getBoundingClientRect` is testable
- [x] Unit tests with `FakeDecorator` + `FakeViewport` classes over an `MDOMParser` fixture (8 tests)

## Phase 2 — Geometry emission + hit index (`hit.ts`, `draw.ts`)

- [x] `HitTester` interface + `QuadTreeHitTester` impl `hitTest(point)` (foreground-over-background, smallest-area)
- [x] testable index builder `buildTargets(RawGeometry, Viewport, Decorator)` — cross-links note/tab, inserts visible glyph
- [x] `RawGeometry` boundary type (score space)
- [x] Unit tests for `hitTest` + builder (chord stack, notehead vs measure, fret hits, cross-links) — 6 tests
- [x] `drawScore` emits `RawGeometry`: per-notehead rects, per-fret rects, per-measure rects (crop applied once)
- [x] thread chord through `PendingStave` (`noteChords`/`tabChords`); only the final pass's arrays kept
- [x] `render.ts` propagates the geometry (transient return until Phase 3 wires it to `Score`)
- [x] compiles; `vex render` on notation + tab fixtures renders intact (no runtime errors)
- [ ] exact-geometry correctness (rect positions) verified at Phase 3/4 once hit-testing is wired live
- [ ] **gate not yet run:** full Docker `vex test` (screenshot regression) — run at Phase 3 with the harness migration

## Phase 3 — Host + render (`stage.ts`, `score.ts`, `render.ts`, migration)

- [ ] `stage.ts`: build DOM layers in the div + coordinate transform (`toScoreSpace`, `clientRectOf`)
- [ ] `Layer` (ctx + dispose), `LayerKind`, dpr-scaled ctx
- [ ] `score.ts`: `Score` shell (owns stage, index, decorations, event bus); `dispose`
- [ ] `render.ts`: take a div, build stage, draw into managed canvas, return `Score`
- [ ] migrate `tests/testing/index.html`, `entry.ts`, `harness.ts`, `cli/render.ts` (canvas -> div)
- [ ] integration screenshots still match baselines (visual output unchanged)

## Phase 4 — Events (`events.ts`, `score.ts`)

- [ ] `EventListenable<M>` interface + reusable `EventBus<M>` impl (dispatch)
- [ ] `Score` pointer events (toScoreSpace -> hitTest -> `{target, native}`)
- [ ] `scroll`, `resize` events; `score.scroll` getter
- [ ] Unit tests: event bus, dispatch with a `FakeHitTester`; browser smoke test (real pointer lands)

## Phase 5 — Layers (public)

- [ ] `addLayer('viewport' | 'content')` / `removeLayer` / `layer.dispose()`
- [ ] sizing policy per kind; resize -> resize+clear+dispatch contract
- [ ] Tests: dimensions per kind; resize fires

## Phase 6 — Decorations + toggles live (`decorations.ts`)

- [ ] `Decorations implements Decorator`: internal `content` layer, retained active-set, repaint (halo under color)
- [ ] wire `Note.color` / `Note.halo`
- [ ] Unit tests with a recording 2D context (clear+redraw, `off()` removes)
- [ ] integration screenshots: a colored note, a halo

---

## Deferred (explicitly out of scope for now)

- Editing mutations + undo/redo history (caller owns the stack)
- `HaloOptions` richness (halo is argument-less for v1)
- Decorating `TabPosition` (no toggles on it yet) — revisit if tab activity coloring is needed
- Dirty-region repaint (full repaint until profiled)
- DOM/`html` layers, public `hitTest`/`notesIn`, animation `invalidate()`, MIDI accessors
- `Chord` as a distinct click target

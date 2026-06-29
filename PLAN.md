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

- [x] No `@stringsync/mdom` type appears in the public surface (callers never need to name one;
      `mnote` stays private behind the unexported `NoteDeps`).
- [x] Rects are stored in score space; crop/scroll/zoom applied only at the boundary
      (`Stage.frame()` is the only place the transform is read).
- [x] Anything a caller uses is exported from `src/index.ts` (`render`, `Score`, `Rect`, `Bounded`,
      `Toggle`, `Note`, `Measure`, `TabPosition`, `PointerTarget`).
- [x] `vex fix` and `vex test` pass (Phase 4: 144 pass / 0 fail, **no screenshot changes**).

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

## Phase 3 — Host + render (`stage.ts`, `score.ts`, `render.ts`, migration) ✅ DONE

- [x] `stage.ts`: `Stage` builds the managed canvas in the div + coordinate transform
      (`toScoreSpace`, `clientRectOf`), reading the live `getBoundingClientRect` so scroll and CSS
      scaling fall out for free; `dispose` removes the canvas and restores the container
- [x] `score.ts`: `Score` shell — owns the stage, `dispose`
- [x] `render.ts`: takes a div, builds the stage, draws into the managed canvas, returns `Score`
- [x] `index.ts` exports the public surface (render/Score/Rect/Bounded/Toggle/targets)
- [x] migrate `tests/testing/index.html`, `harness.ts`, `cli/render.ts`, and `site/src/App.tsx`
      (canvas -> div; the site disposes the prior `Score` between renders so canvases don't stack)
- [x] integration screenshots still match baselines — **131 pass, no screenshot changes**

> **Plan refinements made here (kept lazy):**
> - `Layer` / `LayerKind` / `createLayer` and the dpr-scaled overlay ctx are **deferred to the
>   phase that consumes them** (decorations' content layer in Phase 6; public layers in Phase 5)
>   rather than built speculatively in Phase 3.
> - The hit **index** and **decorations**/**event bus** wire to the `Score` in their own phases
>   (4/6). `drawScore` still returns `RawGeometry`; `render` drops it for now (it's collected
>   inside the draw pass regardless, so ignoring the return costs nothing). Phase 4 threads it
>   through to build the index.
> - No DOM wrapper: the managed canvas is a plain in-flow child of the caller's div, so the box
>   model is identical to the old hand-placed `<canvas>` — that's what keeps screenshots
>   byte-identical. Overlay layers (Phase 5/6) anchor via the `position: relative` Stage sets on
>   the container.

## Phase 4 — Events (`events.ts`, `score.ts`, `decorations.ts`) ✅ DONE

- [x] wired the hit **index** into `Score` (deferred from Phase 3): `render` threads `drawScore`'s
      `RawGeometry` into `buildTargets(geometry, stage, decorations)`; a state-only `Decorations`
      (the real `Decorator`; layer/repaint lands in Phase 6) is built here
- [x] `EventListenable<M>` interface + reusable `EventBus<M>` impl (per-type Sets, `count`,
      snapshot-iterating `emit`)
- [x] `Score` pointer events (`pointermove`/`pointerdown`/`pointerup`/`click`):
      toScoreSpace -> hitTest -> `{ target, point, native }`
- [x] `scroll` + `resize` events; `score.scroll` getter (resize via `Stage.observeResize`/ResizeObserver)
- [x] DOM listeners bound **lazily** — attached on the first subscriber, detached on the last, so an
      unobserved score does no per-pointer hit-testing
- [x] `Host` seam (what `Score` needs from the stage: `toScoreSpace`, `events`, `scroll`,
      `observeResize`, `dispose`) so `Score` is unit-testable with a `FakeHost`
- [x] Unit tests: `EventBus` (events.test.ts, 5); `Score` dispatch/lazy-bind/scroll/resize/dispose
      with `FakeHost`+`FakeHitTester` (score.test.ts, 8); browser smoke test — real pointer maps to
      score space and hit-tests the measure box (tests/integration/events.test.ts)
- [x] `index.ts` exports `EventListenable`, `ScoreEventMap`, `PointerTargetEvent`,
      `ScoreScrollEvent`, `ScoreResizeEvent`

> **Test-infra change:** the browser test needed a second page, but a second Chromium in one
> `bun test` run hangs on teardown in Docker. Fixed at the root: the browser + page server now live
> in the preloaded `setup.ts` as a single shared instance (`testBrowser()` / `testServer()` /
> `TEST_URL`), launched once and closed once. `harness.ts` and the events smoke test both reuse it.

## Phase 5 — Layers (public)

- [ ] `addLayer('viewport' | 'content')` / `removeLayer` / `layer.dispose()`
- [ ] sizing policy per kind; resize -> resize+clear+dispatch contract
- [ ] Tests: dimensions per kind; resize fires

## Phase 6 — Decorations + toggles live (`decorations.ts`)

`decorations.ts` already exists from Phase 4 as the state-only `Decorations implements Decorator`
(color/halo Maps + `dispose`). Phase 6 adds the drawing:

- [ ] give `Decorations` an internal `content` layer (needs Stage `createLayer` — deferred from
      Phase 3) and repaint from the retained active-set (halo under color)
- [ ] `Note.color` / `Note.halo` already delegate here (Phase 1) — verify they paint end to end
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

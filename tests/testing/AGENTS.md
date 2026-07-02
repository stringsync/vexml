# tests/testing

Shared harness for the browser-based integration tests. Preloaded once per `bun test` run
(via bun's preload; runs must go through `vex test`, which sets the sentinel env var and
renders in the pinned Docker image — that image is the source of pixel determinism).

- **serve.ts** — a Bun server for the app (`/`) and corpus files (`/data/:file`, from
  `tests/integration/__data__`).
- **setup.ts** — one shared browser + server for the whole run, a `toMatchScreenshot`
  matcher (pixel-diffs a PNG against `__screenshots__/`, writes diffs to `__diffs__/`,
  regenerates baselines under `UPDATE_SCREENSHOTS=1`), and a **page pool**.
- **harness.ts** — `render(file, config)`: borrows a pooled page, renders a corpus file, and
  returns the screenshot PNG. Defaults both fonts to the system families (see below).

## Page pool

Each pooled page is navigated once and reused, so a test skips the per-test
`newPage()` + `goto()` cost. This lets `test.concurrent` renders run in parallel on separate
pages; `POOL_SIZE` caps how many. Borrow with `withPage`.

## Determinism

Pixel matching is exact, so renders must be bit-stable across parallel runs. Two things make
that hold:

1. **Fonts are system fonts, not network/async.** The Dockerfile bakes in Bravura and
   Source Sans 3; the harness passes them as `family` with no URL so they resolve
   synchronously (no Google Fonts CDN, no woff2 fetch racing the layout).
2. **Each pooled page is font-warmed before its first real render** (`warmFonts` renders
   `font_warmup.musicxml`). Chromium loads a font on first paint, and VexFlow measures tab
   fret digits during layout — a cold measurement places them bistably and flakes. Warming
   paints every font/weight up front so real renders measure a resident font.

If you add tests that use a new font/weight and see flake, extend `font_warmup.musicxml` to
paint it.

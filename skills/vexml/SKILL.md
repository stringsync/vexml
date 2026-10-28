---
name: vexml
description: Render MusicXML sheet music in the browser with @stringsync/vexml. Use when installing vexml, rendering a .musicxml or .mxl file into a DOM element, sizing or scaling a score, choosing a layout or overflow mode, printing pages to PNG, customizing fonts and colors, driving a playback cursor or playhead, timing a score with readTimeline, inserting gap measures for media sync, drawing on canvas layers, markers or a loupe over the score, listening to pointer events on notes, editing notes with EditingSession, or caching and server-rendering snapshots.
---

# vexml

`@stringsync/vexml` renders MusicXML to a `<div>` in the browser. Playground: https://vexml.dev

## Install

```sh
npm install @stringsync/vexml
```

## Render

```ts
import { render } from '@stringsync/vexml';

const res = await fetch('song.musicxml'); // or .mxl
const musicXML = await res.text();        // or .blob() for .mxl
const score = await render(musicXML, element);
```

`render(source, element, config?)` accepts a MusicXML string (`.musicxml`, `.xml`), an
`.mxl` Blob, or an mdom `MDocument`, and resolves to a `Score`. Any format mdom parses works
through the document: for Guitar Pro 7/8 `.gp`,
`render(await new GuitarProParser().parseFromBlob(file), element)` with `GuitarProParser`
from `@stringsync/mdom`. Call `score.dispose()` when the score is
removed; it releases layers and event subscriptions.

### Progressive rendering

`progressive: true` shows the first screen of a long score first: `render` resolves once the
systems filling the visible part of the container (or `scrollContainer`) are drawn, and the
rest draw in idle slices, top to bottom. The pixels are the same once complete. The `Score`
is complete from the start: parts, measures, durations and the playback timeline. The
layout is planned as the systems draw, so the systems not yet drawn are a forecast: how
many there are, which measures each holds and their geometry (each `System`, `MeasureBox`
and note rect, each step's `x` and `systemRect`) can change after every `draw` event until
the event names the system, from when it is exact; `getSystems()` reads the current count.
A pointer over an undrawn system hits nothing. A cursor moved onto such a system draws
through it synchronously first, so cursors and `follow()` are always exact.
`score.isComplete()` and `score.whenComplete()` tell when the whole score is drawn; await
the latter before reading geometry across the score. `score.snapshot()` draws the rest
first. A panoramic or paged layout, a layout following the document (`documentLayout`) or
widening on overflow, and a snapshot, draw whole and report complete at once. A system
found wider than the page after the first screen widens the page from then on (the header
is drawn again across it; systems already drawn keep their draw). Disposing the score
cancels the slices left.

```ts
const score = await render(musicXML, element, { progressive: true });
score.events.on('draw', (e) => e.systems.forEach((s) => refreshOverlay(s)));
score.events.on('complete', () => enableExport());
```

## Sizing and centering

The score scales to fit its container and centers itself with no CSS; resizing the
container re-scales instantly. `layout.referenceWidth` sets the width the score is
engraved at (default 816px, 8.5in).

Override with the `.vexml-canvas` class:

```css
.vexml-canvas { width: 600px; height: auto; }
```

Capping the container turns it into a scroll box: `width`/`maxWidth` scrolls
horizontally (pair with `layout: { type: 'panoramic' }` for a single row),
`height`/`maxHeight` scrolls vertically. `score.setMaxHeight(px | null)` changes the cap
later without a rerender.

## Sticky clef and key

A panoramic score can keep its clefs and key signatures in view while it scrolls
sideways. Once the opening clefs and keys have scrolled wholly out of view, a strip
holding the staff lines, braces, clefs and keys stays pinned at the scroll box's left
edge, as if the page were folded over there. It switches to the new clef or key when a
change scrolls under it; the time signature is not repeated.

```ts
await render(musicXML, element, {
  layout: { type: 'panoramic', stickySignatures: true },
  maxWidth: 800, // or scroll in your own box via scrollContainer
});
```

The fold covers the container's full height, padding included, and its paper takes
`backgroundColor` or else the nearest painted background behind the score. The cursor
scrolls to the right of the fold, and pointer events on it hit nothing. Restyle it with
CSS variables on the container or any ancestor:

```css
.score {
  --vexml-fold-background: #fffdf5;
  --vexml-fold-shadow: linear-gradient(to right, rgba(0, 0, 0, 0.25), transparent);
  --vexml-fold-shadow-width: 20px;
}
```

## Scaling a panoramic line

A panoramic line can be shown smaller or larger than it is engraved. Scale it with the layout
rather than with CSS `zoom` or a `transform` on an ancestor, which vexml can't see: its canvases
are painted at the shown size, and layers, markers, decorations, the cursor, element rects and
the sticky fold all follow.

```ts
await render(musicXML, element, {
  scrollContainer: scroller,
  layout: { type: 'panoramic', stickySignatures: true, fitHeight: 126 }, // or scale: 0.45
});
```

`scale` is CSS px per score px. `fitHeight` fits the line into a strip that many CSS px tall
instead: the staves sit in the middle of the strip, and the line is scaled until whatever
reaches furthest above or below them touches its edge, so the blank margin around the line is
cropped off rather than shrinking the music.

## Printing pages

A `paged` layout fits systems onto fixed-size pages (never splitting a system) and stacks
them on screen. Each page has its own canvas, so it prints sharp at any `pixelRatio`.
Letter is 816x1056 CSS px, A4 794x1123.

```ts
const score = await render(musicXML, element, {
  layout: { type: 'paged', pageWidth: 816, pageHeight: 1056, margin: 48 },
  pixelRatio: 3, // print resolution, independent of window.devicePixelRatio
  backgroundColor: '#ffffff',
});
const pngs = await Promise.all(score.getPages().map((page) => page.toBlob('image/png')));
```

`page.toBlob()` is the page with margins on opaque paper (`backgroundColor`, else the
background behind the score, else white), without layers, markers or cursors.
`page.toCanvas()` returns the canvas, e.g. for a PDF library. The element may be hidden
(`visibility: hidden`, off screen) but must be in the document. `getPages()` is empty for
other layouts.

## When a line won't fit

A MusicXML file may carry its own line breaks laid out for a different page. When a
line needs more room than the reference width, `layout.overflow` decides what gives:

```ts
await render(musicXML, element, {
  layout: { type: 'standard', overflow: 'widen' },
});
```

| mode | result |
| --- | --- |
| `'wrap'` (default) | the line is broken in two; every system fits the reference width |
| `'allow'` | the line keeps its measures and runs past the reference width; the page grows |
| `'widen'` | the reference width grows until every line fits; the score engraves wider and renders smaller |

Reach for `'widen'` to get the engraving the file describes. Set
`layout.honorSystemBreaks: false` to ignore the document's breaks and wrap on width alone.

## Fonts

Font `family`, `url` and `faces` URLs are interpolated into a `<style>` rule and CSS variables, so
never pass raw untrusted input.

```ts
await render(musicXML, element, {
  fonts: {
    // noteheads, clefs, rests, accidentals; default Bravura
    notation: { family: 'Petaluma', url: '/fonts/petaluma.woff2' },
    // part names, lyrics, titles, directions; default Source Sans 3 from Google Fonts.
    // A family with no url must already be on the page.
    text: { family: 'Inter', url: '/fonts/inter.woff2' },
  },
});
```

A notation font other than Bravura needs a `url` (or the app's own `@font-face`); vexml
bundles no other music font.

Bravura ships as two woff2 files: `@stringsync/vexml/fonts/bravura-common.woff2` (about
33 kB) holds the glyphs most scores draw (noteheads, rests, flags, clefs, accidentals, time
signature digits, dynamics, articulations, repeats, tuplets), and
`@stringsync/vexml/fonts/bravura.woff2` (about 247 kB) is the whole face. With no notation
`url` vexml loads them itself through `new URL(..., import.meta.url)`, which Vite, Rollup
and webpack 5 emit as hashed assets: the common file on `BRAVURA_COMMON_RANGE`, the whole
face behind it on `BRAVURA_REST_RANGE`, so a score that draws only common glyphs never
fetches the large file. Layout waits for every glyph a score draws, so a score never paints
with fallback glyphs, and a rare one (an ornament, say) fetches the whole face first.

To cache the files apart from the code and preload them, pass their URLs as `faces` with
the exported ranges, and preload the common file, which nearly every score needs:

```ts
import { BRAVURA_COMMON_RANGE, BRAVURA_REST_RANGE } from '@stringsync/vexml';
import bravuraCommon from '@stringsync/vexml/fonts/bravura-common.woff2?url'; // Vite
import bravura from '@stringsync/vexml/fonts/bravura.woff2?url';

await render(musicXML, element, {
  fonts: {
    notation: {
      family: 'Bravura',
      faces: [
        { url: bravuraCommon, unicodeRange: BRAVURA_COMMON_RANGE },
        { url: bravura, unicodeRange: BRAVURA_REST_RANGE },
      ],
    },
  },
});
// <link rel="preload" href={bravuraCommon} as="font" type="font/woff2" crossorigin>
```

Preload the whole face too only when the app's scores often use rare glyphs: a preload is
fetched whether a score needs it or not. To load the whole face as one file instead, pass
`url: bravura`.

Any font can be split the same way: `faces` in place of `url` (giving both throws), one
`@font-face` per file, every file a score's glyphs need loaded before it draws, so the score
matches the one drawn with the whole face. Give the files ranges that don't overlap: where
two cover a glyph, the browser takes it from the one defined last, fetching that file.

## Colors

`fonts.notation.color` tints engraved glyphs (noteheads, stems, staves, clefs),
`fonts.text.color` the text vexml types (part labels, measure numbers, chord symbols),
and `backgroundColor` paints the container. Each takes any CSS color string.

```ts
await render(musicXML, element, {
  backgroundColor: '#fce4ec',
  fonts: {
    notation: { color: '#1d4ed8' },
    text: { color: '#c2410c' },
  },
});
```

Leave `family` out to recolor a default face, which vexml still loads. A `family` without
a `url` is assumed already on the page (a system font or your own `@font-face`).

## Events

`score.events.on(type, handler)` returns an unsubscribe function; call it when done.
Types: `pointermove`, `pointerdown`, `pointerup`, `click` (each `{ target, point, native }`),
`hover` (fires once per change of element under the pointer, including while scrolling;
never for touch), `scroll`, `resize`, and for a progressive render (see Render) `draw`
(`{ systems: number[] }`, the systems a slice drew) and `complete`. `target` is null on empty space; narrow it with
`instanceof` (`Note`, `TabPosition`, `MeasureBox`, ...), since its `type` string doesn't
narrow in TypeScript. `point` is in score space. Notes expose `halo` and `color` toggles:
`.on(cssColor)` / `.off()`.

```ts
import { Note } from '@stringsync/vexml';

let previous: Note | null = null;

score.events.on('hover', (e) => {
  const current = e.target instanceof Note ? e.target : null;
  if (current !== previous) {
    previous?.halo.off();
    current?.halo.on('rgba(41, 98, 255, 0.35)');
    previous = current;
  }
});
```

## Playback

`score.createCursor()` is a headless position on the playback timeline (repeats and voltas
unrolled, tempo from the score). Step it, seek it, and attach visuals and scrolling:

```ts
const cursor = score.createCursor();
cursor.sync(score.createPlayhead({ color: '#e11d48', widthPx: 2 })); // a moving bar
cursor.follow(); // scroll the bar into view when it leaves; pass { behavior: 'smooth' } as 2nd arg

cursor.events.on('change', (e) => {
  // e.timeMs, e.timeBeats, e.position (score-space box), e.done
  // e.started / e.sustained / e.stopped / e.active: notes, for driving audio
  // e.highlighted: active plus notes tied into them, for coloring
});

const tick = () => {
  cursor.seekMs(audio.currentTime * 1000); // or next(), previous(), seekBeats(b)
  if (!cursor.isDone()) requestAnimationFrame(tick);
};
```

`sync` and `follow` return a Resource; dispose it to detach. A `visibility` event fires
when the bar crosses the viewport edge. Implement `CursorView` (`render(event)`, `dispose()`)
for a custom visual. Disposing the score disposes its cursors. In a progressive render,
moving a cursor onto a system not yet drawn draws through it first, so its position and
`isFullyVisible()` are exact.

Timing queries on the score: `getDurationMs()`, `getDurationBeats()`,
`getMeasureIndexAtMs(ms)`, `getSequence()` (steps and `beatsToMs`, for scheduling audio
yourself), and `getTimeAt({ x, y })`, which maps a score-space point (e.g. a click's
`e.point`) to `{ ms, beat, stepMs, stepIndex }`, or null on empty space.

## Gap measures

A gap is a non-musical measure: an empty stretch of stave with an optional label and
fill that occupies a fixed playback time regardless of tempo. Use gaps to sync notation
to media where the music pauses.

```ts
const score = await render(musicXML, element, {
  gaps: [
    {
      beforeMeasureIndex: 0,      // a source-document measure index
      durationMs: 8000,           // plays for exactly 8s
      label: 'What are pitches?', // optional centered text
      minWidth: 250,              // optional width floor in px
      style: { fill: 'rgba(255, 255, 255, 0.65)' }, // optional overlay
    },
  ],
});
```

Place a gap with `beforeMeasureIndex` (document order; plays on every pass of a repeat)
or `beforeBarIndex` (playback order, repeats and voltas unrolled, gaps not counted; a bar
inside a repeat throws). An `MDocument` is never edited by `render`: insert the gap
measures with `insertGaps(document, positions)` (inside `document.history.edit` when an
`EditingSession` is on) and pass `gaps: [{ measure, durationMs }]` naming them.

`score.getGaps()` returns `{ measureIndex, label, startMs, endMs }` per gap in the order
passed. Playback treats a gap like any other measure.

### Timing before rendering

`readTimeline(source, config?)` parses (or reuses an `MDocument`), places gaps like `render`,
and times the score with no layout or drawing, in tens of ms on a long score. Use it to
size gaps to a recording, then render once:

```ts
import { insertGaps, readTimeline, render } from '@stringsync/vexml';

const timeline = await readTimeline(document);
const bars = timeline.getBars(); // [{ measureIndex, startMs, endMs }] per pass, repeats unrolled
const [intro, outro] = insertGaps(document, [{ beforeBarIndex: 0 }, { beforeBarIndex: bars.length }]);
await render(document, element, {
  gaps: [{ measure: intro, durationMs: leadInMs }, { measure: outro, durationMs: closingMs }],
});
```

A timeline also has `getDurationMs()`, `getDurationBeats()`, `beatsToMs(beats)` and
`getGaps()`, matching the rendered score for the same document and gaps.

## Canvas layers

A layer is a surface you draw on freely with a 2D context; vexml controls its size
and position. The score itself sits at `zIndex` 0: positive draws in front, negative
behind, and equal values stack in creation order. A `content` layer is tiled so it
stays sharp on a score of any length: `ctx.canvas` is the layer's element, not a
`<canvas>`, and draws through a `Path2D` or with a `filter` are slower on long scores.

```ts
const background = score.addLayer('content', -1);
background.ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'; // a CanvasRenderingContext2D
background.ctx.fillRect(50, 50, 100, 80);

const foreground = score.addLayer('content', 1);
foreground.ctx.fillRect(50, 50, 100, 80);

layer.dispose(); // when done with one layer
```

`addLayer('background')` sits behind the score by default. Omit `zIndex` to take the
kind's default.

To draw beside the staff lines, read them off each part's measures: `measure.getStaves()`
gives one `Stave` per staff, top to bottom, with `getNumber()` (the 1-based staff, as
`Voice.getStave()`), `getLineYs()` (top line first), `getRect()` (left edge to right, top
line to bottom) and `getNoteStartX()` (right of the clef, key and time). All in score
space, like a layer's ctx. In a progressive render a measure has none until its system is
drawn.

```ts
const [first] = score.getParts()[0].getMeasures();
for (const stave of first.getStaves()) {
  stave.getLineYs().forEach((y, i) => foreground.ctx.fillText(`line ${5 - i}`, stave.getRect().x - 40, y));
}
```

## Markers and the loupe

A marker is a solid box over the score with no bitmap, so moving it every frame or pointer
move is cheap on any score length. Prefer it over a layer for anything that tracks a drag
(loop regions, a custom playhead). A negative `zIndex` tints behind the notes.

```ts
const loop = score.createMarker(-1);
loop.show({ x: 120, y: 40, w: 300, h: 180 }, 'rgba(255, 200, 0, 0.3)', { radius: 6 });
loop.hide();
```

A loupe is a magnifier floating over the page, for a finger covering what it drags:

```ts
const loupe = score.createLoupe({ width: 160, height: 100, zoom: 2 });
loupe.show(anchorRect, { x, y }); // anchorRect in score px; floats above it
loupe.configure({ zoom: 3 });
loupe.hide();
```

Both are disposed with the score.

## Editing

`EditingSession` keeps a selection on an mdom document and exposes its history.
Render that same document and attach a controller for keyboard navigation,
click/drag selection, highlighting and focus scrolling. Document input requires an
empty `gaps` configuration.

```ts
import { MDOMParser, MusicXMLSerializer } from '@stringsync/mdom';
import { EditingSession, render } from '@stringsync/vexml';

const document = new MDOMParser().parseFromString(musicXML);
const editor = new EditingSession(document);
let score = await render(document, element);
let editing = score.createEditingController(editor);

editor.move('next');                    // select the first written note
editor.move('next', { extend: true });  // extend within its voice
editor.history.edit('Add staccato', () => {
  for (const note of editor.getSelection()) {
    if (!note.articulations.includes('staccato')) note.addArticulation('staccato');
  }
});
editor.setPitch({ step: 'F', octave: 5 }); // one undo step for the group
editor.setTabPosition({
  string: 5,
  fret: 3,
  pitch: { step: 'C', octave: 3 },
});

// Rerender after a document change, keeping the session.
score.dispose(); // also disposes the controller, not the session
score = await render(document, element);
editing = score.createEditingController(editor);

const xml = new MusicXMLSerializer().serializeToString(document);
```

Rules that keep an editor correct:

- Schedule rerenders from the session's `documentchange` event, including after
  `undo()` and `redo()`, and serialize async renders so an old result cannot replace a
  newer edit. Selection changes refresh the controller without a rerender.
- Creating a session enables mdom history: every later document mutation, by any
  consumer, must run inside `editor.history.edit(label, () => { ... })`. Transactions
  are synchronous and atomic. Read `history.canUndo`, `canRedo`, `undoLabel` and
  `redoLabel` for controls.
- Use one controller per render. Options: `selection: { color, focusColor, caretColor,
  caretWidth }`, `follow`, `allowDeselect`, `bindings`, `view`; set `selection`,
  `keyboard`, `pointer` or `follow` to `false` to disable one. `editing.execute(command)`
  lets buttons issue commands and `editing.setEnabled(false)` suspends input and visuals
  while keeping the session.
- Without a controller, use `select(note)`, `selectNotes(notes)` or
  `selectElements(...)` and listen for `selectionchange` and `voicechange`.
- Select structures with `selectMeasure(measure)` and
  `selectMeasure(measure, { extend: true })`; extension keeps a fixed anchor and a
  contiguous range in one part, including empty measures and reversal across the anchor.
  `selectBarline({ measure, location, barline })` selects a left, right or middle barline;
  pass `barline: null` for an implicit ordinary barline. An explicit mdom barline at that
  location is retained automatically when the argument is null.
- Note selections, structural selections and the step-entry caret are mutually exclusive.
  `getFocus()` and `getSelection()` remain note-only; use `getStructuralFocus()`,
  `getStructuralAnchor()`, `getSelectedMeasures()` and `getSelectedBarline()` for structural
  targets. All emit `selectionchange`, and selecting never mutates the document or creates
  history.
- Place a step-entry caret with `setCaret({ part, measure, voice, staff, onset })`; `onset`
  is quarter-note beats from the measure start, and the measure may be empty. Read the
  current document target with `getCaret()`, move its onset with `moveCaret(onset)`, and
  clear it with `clearCaret()`. These emit `caretchange`, never `documentchange`, and create
  no undo step. The default controller draws a 2px staff-height caret and follows it into
  view. Escape and empty-staff clicks clear it only when `allowDeselect` permits; disabling
  the controller hides but retains it. A detached measure hides the caret until undo
  restores it, and each new controller resolves it against that render's geometry.
- `setPitch` supports ordinary pitched notes only; rests, unpitched, tied notes and
  string/fret assignments are rejected before the group changes.
- `setTabPosition({ string, fret, pitch })` changes pitch and fingering together as one
  undo step. The caller supplies the pitch spelling. Rests, unpitched and tied notes are
  rejected before the group changes; empty and unchanged selections return `false`.
- Dispose the session when its consumer goes away, then `document.history.dispose()`
  when discarding the document. Reparsing requires a new session.

- Use `editor.history.edit(label, () => { /* mutate editor.document */ })` for any
  other mdom operation; it may touch any part of the document regardless of selection.
  No-op transactions emit no `documentchange` and keep redo.
- Removed notes and structural targets drop out of the selection; undo restores them.
  Keep the document and history usable after a render error so users can undo.
- The host supplies the container's accessible name, any live selection announcements,
  and whether selection should seek or pause playback.

Default keys: left/right move between chords in the active voice, up/down through
chord members and neighboring voices, Shift (arrows or click) extends a range within
one part and voice, Command/Ctrl-click toggles a note, drag selects enclosed notes and
frets (Command/Ctrl-drag adds; touch drag keeps native scrolling), Escape or a
background click clears, Command/Ctrl+Z undoes and Shift redoes.

## Snapshots

`score.snapshot()` records a rendered score as JSON-safe data; `render(snapshot, element, config)`
rebuilds it without parsing, layout or drawing (roughly 10x faster on a long score). Cache it,
and fall back on `SnapshotMismatchError`, thrown before the element is touched when the
snapshot's version or engraving config differs from yours:

```ts
try {
  score = await render(JSON.parse(cached), element, config);
} catch (e) {
  if (!(e instanceof SnapshotMismatchError)) throw e;
  score = await render(musicXML, element, config);
}
```

The snapshot records the config that shapes engraving (layout, spacing, numbering, tab and
notation toggles, part labels, font families) and `SNAPSHOT_VERSION`; the error's `reason` is
`'version'`, `'config'` or `'format'`. Width, height, `pixelRatio`, `backgroundColor` and font
colors aren't recorded, so one snapshot serves light and dark themes. It keeps the gaps it was
rendered with and ignores `config.gaps`.

A snapshot score has no document: `getSources()` is empty and `createEditingController` throws.
Everything else (playback, cursors, events, layers, pages, the sticky fold) works.

Three entry points, each for a different place code runs; don't mix them up:

- `@stringsync/vexml`: the browser app. `render`, the Score and everything else.
- `@stringsync/vexml/headless`: Bun or Node only, never the browser. `createSnapshot(input,
  canvas, { config, fonts, fontRegistry })` engraves a snapshot with no DOM. It reads font files
  from disk and uses fontkit (a dependency, imported only here). The caller installs a canvas
  library and passes `createCanvas(1, 1)` and `GlobalFonts` from `@napi-rs/canvas`. Its
  snapshots carry glyph outlines, so they draw (and `render` of them returns) before fonts load.
- `@stringsync/vexml/paint`: a small page script ahead of the app (about 8 KB, no parser,
  vexflow or fontkit). `paint(snapshot, element, config)` draws a snapshot; a later
  `render(snapshot, element, config)` from the main entry adopts the painted canvases without
  a repaint. It throws `SnapshotMismatchError` for another snapshot version, and returns a
  `PaintedScore` whose `dispose()` clears the element for a fallback render. Pass the config
  you render with. Don't import the main entry in that script, or it is no longer small.

A headless snapshot can sit a few px off a browser engraving (canvas libraries measure text
slightly differently); `render` shows it as the server engraved it.

## Cleanup

```ts
layer.dispose();
score.dispose();
```

---
name: vexml
description: Render MusicXML sheet music in the browser with @stringsync/vexml. Use when installing vexml, rendering a .musicxml or .mxl file into a DOM element, sizing or scaling a score, choosing a layout or overflow mode, customizing fonts and colors, inserting gap measures for media sync, drawing on canvas layers over or under the score, listening to pointer events on notes, or editing notes with EditingSession.
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

`render(source, element, config?)` accepts a MusicXML string, an `.mxl` Blob, or an
mdom document, and resolves to a `Score`. Call `score.dispose()` when the score is
removed; it releases layers and event subscriptions.

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
`height`/`maxHeight` scrolls vertically.

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

Font `family` and `url` are interpolated into a `<style>` rule and CSS variables, so
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

Bravura ships as a woff2 file, exported as `@stringsync/vexml/fonts/bravura.woff2`. With
no notation `url` vexml loads it itself through `new URL(..., import.meta.url)`, which
Vite, Rollup and webpack 5 emit as a hashed asset. To cache it apart from the code and
preload it, pass its URL and add a preload link:

```ts
import bravura from '@stringsync/vexml/fonts/bravura.woff2?url'; // Vite

await render(musicXML, element, {
  fonts: { notation: { family: 'Bravura', url: bravura } },
});
// <link rel="preload" href={bravura} as="font" type="font/woff2" crossorigin>
```

Layout waits for the face, so a score never paints with fallback glyphs.

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

## Events

`score.events.on(type, handler)` returns an unsubscribe function; call it when done.
Pointer events carry a `target` whose `type` names the element (`'note'` and others),
and notes expose a `halo` for highlighting.

```ts
let previous = null;

score.events.on('pointermove', (e) => {
  const current = e.target?.type === 'note' ? e.target : null;
  if (current !== previous) {
    previous?.halo.off();
    current?.halo.on('rgba(41, 98, 255, 0.35)');
    previous = current;
  }
});
```

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
- Use one controller per render. Options: `selection: { color, focusColor }`,
  `follow`, `allowDeselect`, `bindings`, `view`; set `selection`, `keyboard`, `pointer`
  or `follow` to `false` to disable one. `editing.execute(command)` lets buttons issue
  commands and `editing.setEnabled(false)` suspends input while keeping the session.
- Without a controller, use `select(note)`, `selectNotes(notes)` or
  `selectElements(...)` and listen for `selectionchange` and `voicechange`.
- `setPitch` supports ordinary pitched notes only; rests, unpitched, tied notes and
  string/fret assignments are rejected before the group changes.
- Dispose the session when its consumer goes away, then `document.history.dispose()`
  when discarding the document. Reparsing requires a new session.

Default keys: left/right move between chords in the active voice, up/down through
chord members and neighboring voices, Shift extends a range within one part and voice,
Command/Ctrl-click toggles a note, drag selects, Escape clears, Command/Ctrl+Z undoes
and Shift redoes.

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

A snapshot score has no document: `getSources()` is empty and `createEditingController` throws.

## Cleanup

```ts
layer.dispose();
score.dispose();
```

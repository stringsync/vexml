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
    notation: { family: 'Petaluma' },
    // part names, lyrics, titles, directions; default Source Sans 3
    text: { family: 'Inter', url: '/fonts/inter.woff2' },
  },
});
```

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

`score.getGaps()` returns `{ measureIndex, label, startMs, endMs }` per gap in the order
passed. Playback treats a gap like any other measure.

## Canvas layers

A layer is a `<canvas>` you draw on freely; vexml controls its size and position.
The score itself sits at `zIndex` 0: positive draws in front, negative behind, and
equal values stack in creation order.

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

## Cleanup

```ts
layer.dispose();
score.dispose();
```

# vexml

https://vexml.dev

## Getting Started

Install the package.

```sh
npm install @stringsync/vexml
```

Import the `render` function.

```ts
import { render } from '@stringsync/vexml';
```

Render MusicXML.

```ts
const res = await fetch('song.musicxml'); // or .mxl
const musicXML = await res.text();        // or .blob() for mxl
await render(musicXML, element);
```

## Listening to events

```ts
const score = await render(musicXML, element);

let previous = null;

score.events.on('pointermove', (e) => {
  const current = e.target?.type === 'note'
    ? e.target
    : null;
  if (current !== previous) {
    previous?.halo.off();
    current?.halo.on('rgba(41, 98, 255, 0.35)');
    previous = current;
  }
});
```

`on` hands back a function that unsubscribes; call it when you're done listening.

## Editing

`EditingSession` keeps selection on an mdom document and exposes its native history. Render
that same document and attach a controller for keyboard navigation, click/drag
selection, highlighting and focus scrolling.

```ts
import { MDOMParser, MusicXMLSerializer } from '@stringsync/mdom';
import { EditingSession, render } from '@stringsync/vexml';

const document = new MDOMParser().parseFromString(musicXML);
const editor = new EditingSession(document);
let score = await render(document, element);
let editing = score.createEditingController(editor);

editor.move('next'); // Select the first written note.
editor.move('next', { extend: true }); // Extend within its voice.
editor.history.edit('Add staccato', () => {
  for (const note of editor.getSelection()) {
    if (!note.articulations.includes('staccato')) note.addArticulation('staccato');
  }
});
editor.setPitch({ step: 'F', octave: 5 }); // One undo step for the group.

// Rerender after a document change, keeping the session.
score.dispose(); // Also disposes the controller, but not the session.
score = await render(document, element);
editing = score.createEditingController(editor);

const xml = new MusicXMLSerializer().serializeToString(document);
```

In an application, schedule rerenders from `editor`'s `documentchange` event,
including after `undo()` and `redo()`. Serialize asynchronous renders so an older
result cannot replace a newer edit. Selection changes refresh the controller
without rerendering. Document input requires an empty `gaps` configuration.

Left/right move between chords in the active voice; up/down move through chord
members and neighboring voices. Click selects, Command/Ctrl-click toggles a note,
and dragging selects enclosed notes and frets across voices. Command/Ctrl-drag
adds to the selection; touch dragging keeps native scrolling. Escape or a
background click clears selection. Shift-click and Shift-arrows extend a range
within one part and voice. Command/Ctrl+Z undoes; add Shift to redo.

Customize the controller when attaching it:

```ts
editing.dispose();
editing = score.createEditingController(editor, {
  selection: { color: '#155dfc', focusColor: '#1e3a8a' },
  follow: true,
  allowDeselect: false,
});
```

Use one controller per render. Set `selection`, `keyboard`, `pointer` or `follow`
to `false` to disable individual behaviors. Custom `bindings` map keys to semantic
commands; `editing.execute(command)` lets buttons issue them too. A custom `view`
replaces the selection overlay and is disposed by the controller.
`editing.setEnabled(false)` hides selection and suspends input while preserving
the session. The host supplies the container's accessible name and any live
selection announcements, and decides whether selection should seek or pause playback.

The session also works without a controller: use `select(note)`,
`selectNotes(notes)` or `selectElements(...)`, and listen for `selectionchange`
and `voicechange`. Ranges stay within one part and voice; explicit sets can span
both. Dispose event subscriptions when their consumer is removed.

Pitch edits currently support ordinary pitched notes, rejecting rests, unpitched
notes, tied notes and string/fret assignments before changing the group. Navigation
and selection still support those notes. For any other mdom operation, use
`editor.history.edit(label, () => { /* mutate editor.document */ })`. Transactions
are synchronous and atomic; mdom owns rollback, undo/redo and node identity.
The callback can edit any part of the document, regardless of the current selection.
Rendering remains subject to vexml's notation support.

Creating a session enables mdom history. Subsequent document mutations must run
inside a history transaction, including changes made by other consumers. Native
history edits, undo and redo all produce `documentchange`. No-op transactions
produce no event and preserve redo. Read `history.canUndo`, `canRedo`, `undoLabel`
and `redoLabel` for controls. The former pitch-specific `clearHistory()` API has
been removed; document history is caller-owned. Dispose the session when its
consumer goes away, then `document.history.dispose()` when discarding the document.
Do not dispose document history while a session is still using its notifications.
Reparsing requires a new session.

Removed notes disappear from the visible selection; focus becomes null when its
note is detached. Undo makes retained selection references available again.
Render errors should leave the document and history available so users can undo.

Run `vex dev` to use the playground. Its compact toolbar shows rendering
time and view/edit modes. In edit mode, arrow keys navigate
existing notes; they never change the document. Note entry and duration controls
are deferred while the editing workflow is being redesigned.

## Sizing and centering

The score is scaled to fit its container and centered automatically, with no CSS
needed; resizing the container re-scales instantly. Set the width the score is
engraved at with `layout.referenceWidth` (default 8.5in / 816px).

To override, style the `.vexml-canvas` class:

```css
.vexml-canvas { width: 600px; height: auto; }
```

Capping the container turns it into a scroll box instead of fitting: `width`/`maxWidth` for a
horizontal scroll (pair with `layout: { type: 'panoramic' }` for a single row), `height`/`maxHeight`
for a vertical one.

## When a line won't fit

A MusicXML file can engrave its own line breaks, laid out for whatever page the file
was written for, not for your reference width. When one of those lines needs more room
than you have, `layout.overflow` decides what gives:

```ts
await render(musicXML, element, {
  layout: { type: 'standard', overflow: 'widen' },
});
```

| mode | result |
| --- | --- |
| `'wrap'` (default) | the line is broken in two; every system fits the reference width |
| `'allow'` | the line keeps its measures and runs past the reference width; the page grows to cover the spill |
| `'widen'` | the reference width grows until every line fits, so the whole score engraves wider and renders smaller |

`'widen'` is the one to reach for when you want the engraving the file actually
describes. Set `layout.honorSystemBreaks: false` to ignore the document's breaks
entirely and wrap purely on width.

## Using custom fonts

> [!NOTE]
> Font `family` and `url` are interpolated into a `<style>` rule and CSS variables. Don't pass raw untrusted user input.

```ts
await render(musicXML, element, {
  fonts: {
    // noteheads, clefs, rests, accidentals, etc., default is Bravura
    notation: { family: 'Petaluma' },
    // part/instrument names, lyrics, titles, directions (default is Source Sans 3);
    // optionally specify a font url if it's not already available locally
    text: { family: 'Inter', url: '/fonts/inter.woff2' },
  },
});
```

## Custom colors

`fonts.notation.color` tints the engraved glyphs (noteheads, stems, staves, clefs),
`fonts.text.color` the words vexml types (part labels, measure numbers, chord symbols),
and `backgroundColor` paints the container behind the score. Each is any CSS color string.

```ts
await render(musicXML, element, {
  backgroundColor: '#fce4ec',
  fonts: {
    notation: { color: '#1d4ed8' }, // engraved glyphs
    text: { color: '#c2410c' },     // labels, numbers, chord symbols
  },
});
```

## Gap measures

A gap is a non-musical measure inserted into the score: an empty stretch of stave with an optional label and fill, occupying a fixed amount of playback time regardless of tempo. Use gaps to sync notation to media where the music pauses, e.g. an instructor talking before the piece starts.

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

Read the resulting timing with `score.getGaps()`, which returns `{ measureIndex, label, startMs, endMs }` per gap in the same order they were passed, so join by position to line the score up with your media. Playback treats a gap like any other measure: the cursor glides across it and `getMeasureIndexAtMs` resolves into it.

## Adding a canvas layer

A layer is a `<canvas>` that you can draw arbitrary content on without affecting the sheet music. vexml controls its size and position.

```ts
const score = await render(musicXML, element);

const background = score.addLayer('content', -1); // draws behind the score
// ctx is a standard CanvasRenderingContext2D
background.ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
background.ctx.fillRect(50, 50, 100, 80);

const foreground = score.addLayer('content', 1); // draws in front of the score
foreground.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
foreground.ctx.fillRect(50, 50, 100, 80);
```

Pass an optional `zIndex` to order a layer relative to the canvas the score is drawn on, which sits at `zIndex` 0. A positive value draws in front; a negative value draws behind, showing through the score's transparent pixels. Layers with the same `zIndex` stack in the order they were created.

## Cleaning up

When you're done with a layer or the entire rendered score, call `.dispose()` to clean up resources.

```ts
layer.dispose();
score.dispose();
```

## Development

The library itself lives in [`packages/vexml`](packages/vexml). Everything else in
this repo exists to build, check, or show it off.

| Package | What it is |
| --- | --- |
| [`packages/vexml`](packages/vexml) | `@stringsync/vexml`, the published library |
| `packages/vex` | the `vex` dev CLI, and the Docker images it drives |
| `packages/site` | the playground at https://vexml.dev |
| `packages/integration` | visual-regression tests |

Dependencies:

- [bun](https://bun.sh)
- [docker](https://docs.docker.com/desktop/)

Add the repo's `bin/` to your `PATH` so the `vex` command works anywhere:

```sh
profile=~/.${SHELL##*/}rc # ~/.zshrc, ~/.bashrc, etc.
echo "export PATH=\"$PWD/bin:\$PATH\"" >> "$profile"
source "$profile"
```

Then:

```sh
vex dev                     # run the playground site
vex render --input song.musicxml # render a MusicXML file to a png
```

Don't want it on your `PATH`? Run it directly with `./bin/vex <command>`.

# Editing notes

`EditingSession` is a headless editing cursor tied to an mdom document. Keep it
alive while replacing rendered `Score` instances. Focus and selection refer to
document notes; their rendered wrappers and rectangles belong to one render.

```ts
import { MDOMParser, MusicXMLSerializer } from '@stringsync/mdom';
import { EditingSession, render } from '@stringsync/vexml';

const document = new MDOMParser().parseFromString(musicXML);
const editor = new EditingSession(document);
let score = await render(document, container);

editor.move('next'); // Select the first written note.
editor.move('next', { extend: true }); // Include the next note in its voice.
editor.setPitch({ step: 'F', octave: 5 }); // One undo step for the group.

score.dispose();
score = await render(document, container);
for (const note of editor.getSelectedElements(score.getElements())) {
  note.color.on('#155dfc');
  note.getTabPosition()?.color.on('#155dfc');
}

editor.undo(); // Restore the original MusicXML nodes; render again to see it.
const xml = new MusicXMLSerializer().serializeToString(document);
```

Rendering a document reuses it without reparsing. `config.gaps` must be empty for
document input: the current gap implementation inserts measures into its input.
String and Blob rendering retain their existing gap behavior.

## Keyboard and pointer integration

The host handles events, focus, accessibility and redraw scheduling. Bind left and
right to `move('previous')` / `move('next')`, and pass `{ extend: event.shiftKey }`
for Shift-arrow selection. These operations follow a voice in written order,
including individual chord members, rests, grace notes, invisible notes and
cross-staff notes. Empty measures are skipped, repeats are not expanded, and
navigation clamps at the ends of the voice.

Up/down can call `move('higher')` / `move('lower')` to navigate pitches within the
current chord. These operations do not change pitch. The host can choose other
bindings or select a note in a different voice explicitly.

For a simple click, pass the hit target to `editor.selectElements([target])`.
For Shift-click, get the note from a `Note` or `TabPosition` target and call
`editor.select(note, { extend: true })`. For Command/Ctrl-click, call
`editor.toggle(note)`. Source notes are available through `target.getSources()`.

For a marquee, call
`editor.selectElements(score.getElements().within(scoreSpaceRect))`. Background
boxes are ignored, and noteheads and frets with the same source are deduplicated.
Only indexed glyphs participate in mouse selection: the existing pointer index excludes
grace notes, invisible notes and suppressed tab glyphs. These remain reachable through
document navigation. An empty set clears focus and selection. Point and rectangle queries take score
coordinates; score pointer events already supply a hit target and score point.

After a selection-only change, clear old highlights and draw the new selection.
After a document change, dispose the old score, render the same document again,
then resolve and highlight the new elements. Reattach score event listeners after
each render. Serialize asynchronous renders in the host so an older render cannot
replace a newer edit. The session installs no DOM listeners or global handlers.

## Selection and history contracts

- `select(note)` sets focus and starts a new range anchor. Extending a range keeps
  that anchor fixed and selects inclusively within one part and voice. Crossing
  parts or voices throws before changing selection.
- `selectNotes(notes)` replaces the selection with an explicit set, which may
  cross parts and voices. The last distinct supplied note becomes focus and anchor.
- Getter arrays are snapshots. Detached notes disappear from focus and selection;
  selecting a detached note or a note from another document throws.
- `setPitch`, `undo` and `redo` return whether they changed the document. A group
  edit is one history step. A no-op preserves redo history; a new edit replaces it.
  Moving the cursor creates no history entries, and undo leaves current focus alone.
- The session owns mutation history. Call `clearHistory()` after external document
  edits. Some conflicting edits are detected before undo/redo, but arbitrary edits
  to the mutable mdom tree are not tracked. Reparsing creates a new document and
  requires a new session.

## First milestone boundaries

This API navigates and selects notes and changes the pitch of ordinary pitched
notes. It retains note identity, duration, articulations and slurs. A changed pitch
drops the old explicit accidental glyph so engraving derives the new spelling;
undo restores the exact original pitch and accidental nodes.

Pitch changes reject rests, unpitched notes, tied notes and notes with string/fret
assignments before modifying the group. Ties require coordinated endpoint edits;
tablature requires a fingering decision. Selection and navigation support these
notes even though this pitch command does not edit them.

Insertion positions, create/delete commands, rhythmic edits, annotation targets,
musical passage ranges across voices, automatic scrolling and a packaged keyboard/
mouse controller are subsequent milestones. The existing playback cursor remains
independent of this editing session.

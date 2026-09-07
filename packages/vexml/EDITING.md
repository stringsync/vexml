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

## Default editing UI

Attach an editing controller to each render. The controller installs scoped keyboard
and pointer listeners, draws selection on a separate layer, and scrolls the focused
note into view. Programmatic session selection changes refresh the view too.

```ts
const editor = new EditingSession(document);
let score = await render(document, container);
let editing = score.createEditingController(editor, {
  selection: { color: '#155dfc' },
  follow: true,
});

// No manual highlighting or selection synchronization.
editor.move('next');

// Keep document identity, selection, active voice and history across layout changes.
score.dispose(); // Disposes editing and its listeners/view, but not editor.
score = await render(document, container, nextConfig);
editing = score.createEditingController(editor);
```

The container becomes keyboard-focusable if it has no tabindex. The controller
restores the attribute it added on disposal. Keyboard events are handled only when
that container is the target, leaving nested inputs and controls alone. Pointer
selection focuses the container without browser scrolling. The host supplies the
container's accessible name and any live selection announcement.

Defaults: left/right follow chord leads in the written voice; up/down traverse
chord members in staff order, then continue to the neighboring voice. Shift-arrow
extends the range. Escape clears selection while retaining the active voice. Click selects a note or fret, Shift-click extends
a range, and Command/Ctrl-click toggles set membership. Shift-click into another
part or voice starts a fresh selection. Background clicks clear selection.
`toggleOnClick: true` makes a second plain click on the sole focused note clear it.

Scrolling follows focus changes, not viewport events, so manual scrolling stays
under the user's control. An unindexed focus falls back to its measure box when
available. The overlay outlines focus separately from the complete selection and
includes both notation and tab targets without changing playback/hover colors.

## Compositions and customization

- `EditingSession` owns document focus, range/set selection, active voice and
  mutation history. `getVoices()` enumerates `{ part, voice }` pairs in written
  order. `setActiveVoice()` changes context without moving focus;
  `editing.selectVoice()` selects a nearby onset in the chosen voice.
- `EditingNavigator` resolves `note`, `measure`, `voice`, `chordPitch` and `vertical` moves.
  `vertical` (-1 up, +1 down) traverses every chord member before leaving its
  voice, entering the next chord at its top when descending or bottom when
  ascending. Without focus it starts at the appropriate edge of the first/last
  chord in the active voice. A `select` command can set `chordEdge: 'top'` or
  `'bottom'` to enter a particular chord from playback or another host source.
  `ChordNoteOrder` orders by staff number, then written diatonic
  position, ignoring accidentals; equal positions retain document order. Unpitched
  notes use their display position. `voice` remains an explicit whole-voice jump,
  and `chordPitch` retains pitch-only movement within the current chord.
  It works without a score. `EditingSession.move()` delegates its existing string
  commands to the same navigator. With no focus, horizontal movement starts at the
  first/last chord lead of the active voice (initially the first written voice).
- `EditingLayout` optionally supplies written measures grouped by rendered system.
  `ScoreEditingLayout` adapts a score. With this adapter, voice navigation crosses
  into the next system's first voice or the previous system's last voice; without
  it, voice navigation clamps at the first/last voice in the document. Notes and
  measures always follow written order, skipping empty measures without expanding
  repeats. Cross-voice range extension through navigation is a no-op.
- `EditingBindings.resolve(key)` maps a key snapshot to a semantic `EditingCommand`.
  Return null to leave the key to the host. Replace the defaults to bind arrows to
  voice navigation or Shift-arrows to measure jumps. `editing.execute(command)`
  lets buttons issue the same commands directly.
- `EditingView.render(presentation)` receives current rendered notes, focus and
  score-space focus geometry. `SelectionOverlay` is the default view. A custom
  `view` is owned and disposed by the controller. `selection: false` disables the
  default overlay; `keyboard: false`, `pointer: false` and `follow: false` disable
  those individual behaviors. A framework can call `editing.handleKey(key)` and
  prevent the browser default when it returns true.

`score.createEditingController()` composes the navigator with `ScoreEditingLayout`,
a default or custom view, the existing score pointer events, and its scroller.
The score disposes every controller it creates; disposing a controller early also
unregisters it. `EditingController` can alternatively be constructed over explicit
element, navigator, event, DOM, scroller and view dependencies for custom hosts.

The controller's `change` event carries the resolved presentation. `command`
reports a handled semantic command and whether it moved selection, allowing an
application to provide transport feedback even at navigation boundaries.

The session emits `selectionchange` after selection operations, `voicechange` when
active context changes, and `documentchange` after a successful pitch edit, undo or
redo. Selection operations do not emit document changes. No-op pitch commands and
empty history operations do not emit document changes either. Dispose subscriptions
when their consumer is removed. External document mutations are not observed.

## Rendering and playback

The host still schedules document rerenders after `documentchange`: dispose the old
score, render the same document, then attach a new controller. Serialize asynchronous
renders so an older result cannot replace a newer edit. Selection-only operations
need no engraving pass. The session itself installs no DOM or global listeners.

Playback policy remains independent. `Sequence.getNoteNearMs(timeMs, { voice })`
finds the nearest playback position in a preferred part/voice, falling back to any
available note. `{ note }` limits it to that rendered note, preserving the nearest
repeat occurrence; an absent note returns null. The host decides whether selection
pauses or seeks playback. Editing focus scrolling does not depend on playback.

For manual marquee input, use
`editor.selectElements(score.getElements().within(scoreSpaceRect))`. Notehead and
fret hits are deduplicated. Pointer events already supply score-space coordinates
and hit targets. Grace notes, invisible notes and suppressed tab glyphs may lack
indexed pointer targets but remain reachable by document navigation.

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
musical passage ranges across voices and a packaged marquee gesture are subsequent
milestones. The existing playback cursor remains
independent of this editing session.

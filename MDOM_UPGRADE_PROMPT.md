# Prompt: close the mdom gaps vexml is working around

You are working on `@stringsync/mdom` (currently `0.1.5`). Its main consumer,
`@stringsync/vexml`, has ~800 lines of code that reach past mdom's typed nodes into the
generic XML axes — `MElement`, `MNode`, `.children`, `.child(tag)`, `.childrenNamed(tag)`,
`.childrenOfType`, `.closest`, `.getAttribute`, `.tag`, `.text`. Every one of those is a
feature mdom is missing.

**Goal: a consumer should never need to import `MElement` or `MNode`.** Those types are
mdom's internals. If a renderer has to `instanceof MElement` to filter a children list, or
compose a positional walk over raw tags, the query layer failed to model something.

Work through the sections below. Each one names the vexml call site it exists to delete, so
you can check your API against a real caller rather than guessing. Keep the existing API
intact — this is additive. `MElement`'s generic axes stay; they just stop being the only way
to reach anything.

---

## Ground rules

- **Model the shape, not the tags.** `Direction.dynamics` returning typed marks beats
  `direction.childrenNamed('direction-type').flatMap(t => t.childrenNamed('dynamics'))`
  because the nesting is MusicXML's problem, not the caller's.
- **Positional readings belong in mdom.** MusicXML repeatedly encodes structure as
  interleaved sibling runs (`<beat-unit>` + trailing `<beat-unit-dot>`, `<key-step>` +
  `<key-alter>` + `<key-octave number>`, `<metronome-note>` split by `<metronome-relation>`).
  Every consumer that reads these writes the same index-pairing walk. Do it once, here.
- **Never drop an attribute a renderer can see.** Several existing accessors are lossy and
  force the caller back to the raw element to recover what was thrown away
  (`Note.notehead` drops `filled`; `Print.newSystem` collapses a tri-state to a boolean;
  `Direction.metronome` keeps only the first beat unit). Those are bugs, not omissions.
- **Distinguish absent from default.** `Print`'s `new-system="no"` is a positive statement
  ("this measure stays on its line") and must not read the same as an absent attribute.
- Add tests for each new accessor against a real MusicXML fragment, including the
  malformed/partial forms called out below — exporters emit them constantly.

---

## 1. Lossy accessors (fix these first — they are correctness bugs)

### 1.1 `Print.newSystem` / `newPage` collapse a tri-state

`new-system` has three states: `"yes"`, `"no"`, absent. vexml needs all three — `"no"` means
"the document laid this line out; squeeze rather than wrap", which is not the same as
silence. Today it must do `print.getAttribute('new-system') === 'no'`.

Add (keeping the booleans):

```ts
get systemBreak(): 'yes' | 'no' | null
get pageBreak(): 'yes' | 'no' | null
```

*Caller:* `src/engraving/layout-planner.ts:550`.

### 1.2 `Note.notehead` drops `filled`

`<notehead filled="no">` on a quarter draws an open head (a ghost/ringing note). The
accessor returns `{value, parentheses}` only, so vexml does
`note.child('notehead')?.getAttribute('filled')`.

Add `filled: boolean | null` to the returned shape (null = unstated, leave it to the
duration). While you're there, add `color: string | null` — see §4.

*Caller:* `src/engraving/note-translator.ts:224`.

### 1.3 `Direction.metronome` keeps only the first beat unit

A `<metronome>` carries up to two beat units (`dotted quarter = dotted half`, a metric
modulation), a `parentheses` attribute, and an entirely separate `<metronome-note>` form
that states a note-group relation ("two beamed eighths = a triplet quarter-eighth" — the
swing marking). The current accessor flattens all of that to one unit and drops the
attribute, and a `<direction>` routinely carries *two* `<metronome>`s in successive
`<direction-type>` blocks.

Replace with a typed element. See §2.1.

*Caller:* `src/engraving/score-reader.ts:41-117, 720-782` (~110 lines that vanish).

### 1.4 `Slur.partner` pairs in document order, which is wrong across `<backup>`

This is the most expensive gap. `resolvePartner` scans siblings in **document** order. A
`<backup>` puts a later voice's notes after an earlier voice's in the file even though they
sound together, so a slur that opens in the left hand and closes on a right-hand note the
exporter wrote *earlier* finds no stop at all — it runs on until some later measure's stop.
Finale exports every cross-stave piano figure this way (Dichterliebe, every other bar), and
the result is two bars of ink across the page.

vexml works around it in `src/engraving/spanner-builder.ts:1600-1700` with a part-wide,
`WeakMap`-cached re-pairing pass (`slurPartner` / `pairSlurs`, ~90 lines) that walks markers
in **onset** order with two tie-breaks:

- **Same voice wins.** Two voices in parallel each keep their own arc even when their slurs
  are different lengths — the case a purely positional rule cannot get right.
- **Otherwise the oldest open start wins.** That's a chord: its members open together, so
  voice can't separate them, but the first start belongs with the first stop.

Both are needed because exporters break the "a number can't reopen before it closes" rule
constantly (a divisi stave's two voices, or a chord's members, all slurring under number 1).

Fix `resolvePartner` — or at minimum `Slur`'s spec — to resolve in onset order with those
tie-breaks, and cache the per-part pairing. This should be the default, not an option: the
document-order answer is simply wrong on real files. Verify against a fixture with a
`<backup>` between the two ends of a slur.

Apply the same reasoning to `Tie`, `Slide`, `Glissando`, `HammerOn`, `PullOff` — every
note-attached spanner that can cross a `<backup>`.

### 1.5 `groupBeams` drops orphaned `continue`/`end` markers

vexml can't use `Measure.beams` and rolls its own run grouping
(`src/engraving/spanner-builder.ts`, `buildBeams`). Guitar Pro encodes a
triplet-of-16ths + 2-16ths beat as `begin, continue, end, continue, end` at level 1 — one
continuous primary beam with a sub-beam split in the middle. `groupBeams` closes the run at
the `end` and leaves the trailing notes flagged.

Two things are needed:

- An `end` should not close the run; only a `begin` (new run) or an unbeamed note should.
  A rest with no beam markers shouldn't close it either — a rest can sit under a beam.
- The secondary-beam break positions are a separate output. Return runs as
  `{ notes: Note[], breaksAfter: number[] }` (indexes into `notes` where a level-2 `end`
  that isn't the run's last note marks a sub-beam split), or expose it as
  `Measure.beamRuns(): BeamRun[]` alongside the existing `beams`.

---

## 2. New typed elements

These are the tags vexml reads today by tag name off `MElement`. Each becomes a class in the
established style (extends `MElement`, doc comment naming the MusicXML shape and what a
renderer does with it, closed unions where the spec has an enum).

### 2.1 `Metronome` + `MetronomeNote`

```ts
class Metronome extends MElement {
  /** `<beat-unit>` values in document order, each with the `<beat-unit-dot/>` count that
   *  trails it. Two entries = a metric modulation. MusicXML puts the dots AFTER the unit
   *  they modify, so only a positional walk tells "dotted quarter = half" from
   *  "quarter = dotted half". */
  get beatUnits(): Array<{ type: NoteType; dots: number }>
  /** `<per-minute>`, kept as a string (MusicXML allows "ca. 120"); null when absent. */
  get perMinute(): string | null
  get parentheses(): boolean
  /** The `<metronome-note>` form, split at `<metronome-relation>`. Null when this
   *  metronome is written in the `<beat-unit>` form instead. */
  get relation(): { left: MetronomeNote[]; right: MetronomeNote[] } | null
}

class MetronomeNote extends MElement {
  get type(): NoteType            // <metronome-type>, 'quarter' when absent
  get dots(): number              // <metronome-dot/> count
  get beams(): BeamValue[]        // <metronome-beam> values, document order
  get tuplet(): { type: 'start' | 'stop'; actual: number; normal: number } | null
}
```

And on `Direction`:

```ts
/** Every `<direction-type><metronome>`, document order. A direction routinely carries two
 *  — the rate in one `<direction-type>` and a note-group relation in the next, printed
 *  side by side. */
get metronomes(): Metronome[]
```

Keep the existing `metronome` accessor as `metronomes[0]`-with-the-old-shape if you want,
but the new one is what consumers should reach for.

*Callers:* `src/engraving/score-reader.ts:41-117` (`metronomesOf`, `beatUnitsOf`,
`modulationNotesOf`), `720-782` (`tempoOf`, `modulationOf`).

### 2.2 `Sound` + swing

`<sound>` appears both inside a `<direction>` and as a direct `<measure>` child, with the
same meaning, so every consumer has to look in both places. vexml has a private generator
just to merge the two.

```ts
class Sound extends MElement {
  /** The `tempo` attribute in quarter notes per minute; null when unset. */
  get tempo(): number | null
  get dynamics(): number | null
  /** `<swing>`: the on-beat:off-beat ratio and the note value it divides. `<straight/>`
   *  reads as an even 1:1 so it cancels a carried swing rather than reading as "no
   *  instruction". `unit` is in quarter-note beats — eighth = 0.5, 16th = 0.25. */
  get swing(): { first: number; second: number; unit: number } | null
}
```

- `Direction.sound: Sound | null`
- `Measure.sounds: Sound[]` — every `<direction><sound>` in document order, then the
  measure's own standalone child. This merge is the whole point.

*Callers:* `src/engraving/score-reader.ts:794-861` (`playbackTempoOf`, `soundsOf`,
`swingOf`).

### 2.3 `Dynamics`, `Rehearsal`, `Words`, `Segno`, `Coda`

The `<direction-type>` children mdom deliberately deferred. vexml now needs all of them, and
each currently costs a two-level `childrenNamed` flatMap plus an `instanceof MElement`
filter.

```ts
class Dynamics extends MElement {
  /** The marking names, document order. MusicXML names the marking by the TAG —
   *  `<dynamics><sfz/>` — so the tag name is the text to print; `<other-dynamics>`
   *  contributes its text instead. */
  get marks(): string[]
  get placement(): 'above' | 'below' | null
}

class Rehearsal extends MElement {
  get text(): string
  /** `enclosure`: 'square' | 'circle' | 'none' | …; null when unstated. */
  get enclosure(): string | null
}

class Words extends MElement {
  get text(): string
  get fontStyle(): string | null     // italic/normal
  get fontWeight(): string | null
}
```

On `Direction`:

```ts
get dynamics(): Dynamics[]
get rehearsals(): Rehearsal[]
get wordsElements(): Words[]           // `words` stays as string[] for compatibility
/** `<segno/>` and `<coda/>` markers under this direction, document order — the landmarks
 *  a D.S./D.C. jumps to. */
get navigations(): Array<'segno' | 'coda'>
```

*Callers:* `src/engraving/score-reader.ts:907-956` (`dynamicsOf`, `rehearsalsOf`),
`1016-1026` (`navigationsOf`), `879-893` (`wordsOf`).

### 2.4 `Bracket` and `Dashes` — the two missing direction spanners

`<direction-type><bracket>` (phrase/analysis brackets) and `<dashes>` (the dashed line
trailing a "cresc." or "rit.") are ordinary numbered start/stop spanners, exactly like
`Wedge`. mdom models none of them, so vexml hand-rolls the part-wide pairing in
`directionLinesOf` (~50 lines with its own `open` map).

```ts
class Bracket extends MElement {
  get number(): string
  get bracketType(): 'start' | 'stop' | 'continue'
  /** `line-end`: how this end terminates — 'up' | 'down' | 'arrow' | 'none'. */
  get lineEnd(): 'up' | 'down' | 'arrow' | 'none'
  get lineType(): string | null       // solid/dashed/dotted/wavy
  get direction(): Direction
  get partner(): Bracket | null
  get members(): Bracket[]
  get measureBeat(): number | null
}

class Dashes extends MElement {
  get number(): string
  get dashesType(): 'start' | 'stop' | 'continue'
  get direction(): Direction
  get partner(): Dashes | null
  get members(): Dashes[]
  get measureBeat(): number | null
}
```

`Direction.brackets: Bracket[]`, `Direction.dashes: Dashes[]`.

Note the binding convention differs from a pedal: both ends of a bracket bind to the note
that *follows* the direction (`nextNote`), because a bracket's stop marks the moment the
passage ends and MusicXML writes it before the last note it covers. `Direction.nextNote` /
`previousNote` already give consumers what they need — no new accessor required.

*Caller:* `src/engraving/score-reader.ts:1191-1242`.

### 2.5 `FiguredBass` + `Figure`

The continuo numerals under a bass line. vexml walks `measure.children` looking for the tag,
then hand-binds it to the next non-chord note.

```ts
class Figure extends MElement {
  get prefix(): string | null        // sharp/flat/natural/double-sharp/slash/…
  get number(): string | null        // <figure-number>
  get suffix(): string | null
  get extend(): boolean
}

class FiguredBass extends MElement {
  /** The stack, top figure first. */
  get figures(): Figure[]
  get parentheses(): boolean
  /** The note this stack sits under — the nearest non-`<chord/>` note after it, the same
   *  binding `Harmony.nextNote` uses. */
  get nextNote(): Note | null
}
```

`Measure.figuredBasses: FiguredBass[]`.

*Caller:* `src/engraving/score-reader.ts:971-1005`.

### 2.6 `PartGroup` — the `<part-list>` structure

`<part-group>` markers are flat, interleaved with `<score-part>` entries, paired by
`number`, and their extent is "the parts between the start and the stop". Nesting depth is
how many groups were open when this one started. Every consumer that wants brackets/braces
across parts writes the same walk — vexml's is ~55 lines and has to reach the part-list via
`parts[0]?.parent?.child('part-list')`, which is the worst escape hatch in the codebase.

```ts
interface PartGroupSpan {
  /** Index into `score.parts` of the group's first and last member. */
  fromPartIndex: number
  toPartIndex: number
  /** `<group-symbol>`: 'none' | 'brace' | 'line' | 'bracket' | 'square'; null when absent. */
  symbol: string | null
  /** `<group-name>` / `<group-abbreviation>`; null when absent. */
  name: string | null
  abbreviation: string | null
  /** `<group-barline>`: 'yes' | 'no' | 'Mensurstrich'; null when absent. MusicXML defines
   *  no default, so absence stays distinct from an explicit 'yes'. */
  barline: string | null
  /** Nesting depth; 0 is outermost. */
  depth: number
}
```

On `Score`: `get partGroups(): PartGroupSpan[]`, outermost first. Drop groups whose stop
never arrives or whose span runs past the end of the part list.

*Caller:* `src/engraving/staves.ts:204-274`.

### 2.7 `StaffDetails` + `StaffTuning`

`Measure` already surfaces `getStaveLines` and `getLineDetails` off `<staff-details>`, but
not the string tunings — the thing that identifies a tablature staff. vexml walks
`measure.childrenNamed('attributes') → childrenNamed('staff-details') → childrenNamed('staff-tuning')`
in two separate functions.

```ts
class StaffTuning extends MElement {
  /** The `line` attribute: which staff line this string sits on (1 = bottom). */
  get line(): number
  get step(): string       // <tuning-step>
  get octave(): number     // <tuning-octave>
  get alter(): number      // <tuning-alter>, 0 when absent
  /** MIDI number of the open string — the scale tunings and pitches compare on. */
  get midi(): number
}
```

- `Measure.getStaffTunings(staff?: string): StaffTuning[]` — carry-forward, like `getClef`.
- `Part.getStaffTunings(staff: string): StaffTuning[]` — the first declaration anywhere in
  the part (tuning is effectively a per-part constant, like `partSymbol`).

Note for consumers: MusicXML numbers tuning *lines* bottom-up and *strings* top-down, so
they invert (`string = lineCount - line + 1`). Document that on `StaffTuning.line` so every
consumer doesn't rediscover it.

*Callers:* `src/engraving/staves.ts:11-78`.

### 2.8 `Ornament` and the `<notations><ornaments>` children

mdom reads `<ornaments>` only for the `<wavy-line>`. Everything else — trills, turns,
mordents, the schleifer, `<tremolo>`, `<accidental-mark>` — comes off the generic axes, and
the *order* matters: an `<accidental-mark>` is not an ornament of its own, it's the small
sharp/flat drawn with the ornament it follows, and a turn's pair reads one above and one
below.

```ts
class Ornament extends MElement {
  /** The ornament's tag: 'trill-mark' | 'turn' | 'inverted-turn' | 'delayed-turn' |
   *  'mordent' | 'inverted-mordent' | 'shake' | 'schleifer' | 'tremolo' |
   *  'accidental-mark' | … — a closed union. */
  get ornamentType(): OrnamentType
  get placement(): 'above' | 'below' | null
  /** `<tremolo>` slash count (its text), when this is a tremolo; null otherwise. */
  get tremoloMarks(): number | null
  /** `<tremolo type>`: 'single' | 'start' | 'stop' | 'unmeasured'. */
  get tremoloType(): string | null
  /** An `<accidental-mark>`'s glyph name (its text); null otherwise. */
  get accidentalMark(): string | null
}
```

`Note.ornaments: Ornament[]` — every child across the note's `<notations><ornaments>`
blocks, **in document order**, including the `<accidental-mark>`s, so a consumer can attach
each mark to the ornament it follows.

*Caller:* `src/engraving/note-translator.ts:582-640`.

### 2.9 `Technical` marks

Same story: mdom reads `<technical>` only for `string`/`fret`/`bend`/`harmonic`. The rest —
`<fingering>`, `<pluck>`, `<up-bow>`, `<down-bow>`, `<open-string>`, `<snap-pizzicato>`,
`<stopped>`, `<thumb-position>`, `<double-tongue>`, `<triple-tongue>` — is read off the
generic axes, together with `placement`, `alternate`, and `substitution` attributes.

```ts
class Technical extends MElement {
  /** The mark's tag. */
  get technicalType(): string
  get text(): string | null
  get placement(): 'above' | 'below' | null
  /** `<fingering alternate="yes">` — a second option, printed "(2)". */
  get alternate(): boolean
  /** `<fingering substitution="yes">` — change fingers while the key is held, printed "5-3". */
  get substitution(): boolean
}
```

`Note.technicals: Technical[]` — every child across the note's `<notations><technical>`
blocks, document order. Keep the existing `string`/`fret`/`bend`/`isHarmonic`/
`otherTechnical` accessors; they're the common path.

*Callers:* `src/engraving/note-translator.ts:665-700, 818-870`.

### 2.10 `NonArpeggiate`

mdom has `Note.arpeggiate` but not its opposite. `<non-arpeggiate>` is the bracket marking a
chord to be struck together: `type="bottom"` on the lowest member it covers, `type="top"` on
the highest, nothing on the members between.

```ts
/** `<notations><non-arpeggiate>`: 'top' | 'bottom'; null when the note carries none. */
get nonArpeggiate(): 'top' | 'bottom' | null
```

Handle the half-marked chord (only one end present — exporters emit these) by reporting what
is there; the consumer decides how to bracket out to the chord edge.

*Caller:* `src/engraving/note-translator.ts:975-985`.

### 2.11 Display positions: `<unpitched>` and pitched rests

Both `<rest>` and `<unpitched>` carry a `<display-step>`/`<display-octave>` pair, and in both
it is a staff *position*, not a pitch — which line or space to draw the glyph on. A kick, a
snare, and a hi-hat read as three different rows under one percussion clef entirely through
this. mdom exposes neither, so vexml has a shared `displayKey(element: MElement)` helper
called with `note.child('unpitched')` and `note.child('rest')`.

```ts
/** `<unpitched><display-step>/<display-octave>`: the staff POSITION of an unpitched
 *  (percussion) note; null when the note is pitched or carries no pair. */
get unpitched(): { step: string; octave: number } | null
/** The same pair on a `<rest>` — pinning a rest to a chosen line instead of the default
 *  centered one, standard in multi-voice writing. Null when the rest carries none. */
get restPosition(): { step: string; octave: number } | null
```

*Caller:* `src/engraving/note-translator.ts:247-291`.

### 2.12 Non-traditional key alterations

`<key-step>` / `<key-alter>` / `<key-accidental>` / `<key-octave number>` are interleaved
sibling runs read positionally — the nth `<key-step>` pairs with the nth `<key-alter>`, and
`<key-octave number="n">` indexes the nth alteration. **Two independent consumers in vexml
write this walk** (`ScoreReader.keyIdentity` and `DrawPass.customKeyAccidentals`), which is
the clearest possible signal it belongs here.

```ts
/** The `<key-step>`/`<key-alter>` alterations of a non-traditional key, in the order
 *  given (NOT circle-of-fifths order — that's the point of the form). Empty for an
 *  ordinary `<fifths>` key. */
get alterations(): Array<{
  step: string
  alter: number
  /** `<key-accidental>` glyph name when the nth one is present; null otherwise. */
  accidental: string | null
  /** `<key-octave number="n">` for this alteration; null when unstated. */
  octave: number | null
}>
```

*Callers:* `src/engraving/score-reader.ts:504-516`, `src/engraving/draw-pass.ts:253-290`.

### 2.13 `Lyric` elisions

`Lyric.syllable` joins the `<text>` runs with nothing between them, so an elided
two-syllable lyric comes out `"de"` rather than `"d e"`. vexml has to re-read the children
to recover the separators.

```ts
/** The syllable's runs in document order, so a consumer can render the elision
 *  separators. An empty `<elision/>` leaves the symbol to the renderer (a space is the
 *  conventional pick); one carrying text (an undertie, an underscore) uses that. */
get runs(): Array<{ kind: 'text' | 'elision'; text: string }>
```

*Caller:* `src/engraving/note-translator.ts:1190-1203`.

---

## 3. Missing queries on existing nodes

### 3.1 Typed ancestor accessors (kills every `closest()` and `.parent`)

A consumer should never touch `.parent` or `closest(Ctor)`. Both return `MElement | null`,
which drags the type into the consumer's own signatures — that's how `MElement` leaked into
vexml's *public* API (`Element.getSources(): readonly MElement[]`).

Add non-null typed accessors wherever the containment is structural:

```ts
Note.measure: Measure          // a note attached to a tree always has one
Note.part: Part
Measure.part: Part
Direction.measure: Measure
Harmony.measure: Measure
Voice.part: Part
Slur.part: Part                // and Tie, Beam, Tuplet, Slide, Glissando, HammerOn, PullOff
Wedge.measure / Pedal.measure / OctaveShift.measure
```

Throw (via `required`) on a detached node rather than returning null — that matches the
existing convention on `Slur.note` ("an attached marker always has one").

*Callers:* `src/engraving/spanner-builder.ts:1610` (`slur.closest(Part)`),
`src/elements/element-factory.ts:124` (`rn.mnote.parent`),
`src/engraving/staves.ts:234` (`parts[0]?.parent?.child('part-list')` — covered by §2.6).

### 3.2 `Direction.staff` and `Direction.placement`

`<direction><staff>` decides which staff of a multi-staff part a directive prints over;
without it every directive piles onto the part's top staff. vexml reads
`d.child('staff')?.text ?? '1'` in two places. `Note.staff` already exists with exactly this
shape — mirror it.

```ts
/** The staff this direction prints over; '1' when omitted, matching `Note.staff`. */
get staff(): string
/** `placement`; null when unstated (the default is renderer's choice, so don't pick one). */
get placement(): 'above' | 'below' | null
```

Add `placement` to `Harmony` and `FiguredBass` too.

*Callers:* `src/engraving/score-reader.ts:140-146, 886, 915`.

### 3.3 `Measure.isImplicit`

`<measure implicit="yes">` is a pickup bar, or the back half of a measure split across a
system break — short *by declaration*, not underfull by accident. A layout engine has to
know, or it pads a pickup out to a full bar's width. vexml reads
`measure.getAttribute('implicit') === 'yes'`.

```ts
get isImplicit(): boolean
```

*Caller:* `src/engraving/score-reader.ts:526`.

### 3.4 `Barline.measureBeat`

A `<barline location="middle">` is a divider that lands off the measure edge (a double bar
or dotted divider mid-bar). MusicXML writes it between two notes, so its beat comes from the
timeline. Every other spanner marker in mdom has `measureBeat`; `Barline` doesn't, so vexml
re-folds the measure's children by hand — and its own comment notes the fold is wrong on a
multi-voice measure because it doesn't rewind a `<backup>`. `onsetOf` already does this
correctly.

```ts
/** Onset within the measure, in beats — where this barline sits in the backup/forward
 *  fold. Meaningful for `location="middle"`; the edges are 0 and the measure's end. */
get measureBeat(): number | null
```

*Caller:* `src/engraving/score-reader.ts:571-586` (deletes the whole hand-rolled fold).

### 3.5 `Measure.clefChanges(staff)` — mid-measure clef changes with onsets

The single gnarliest walk in vexml (`midClefsOf`, ~38 lines). MusicXML writes a mid-measure
clef change as an `<attributes>` block sitting between two notes. Resolving it needs:

- Skip the measure's *leading* `<attributes>` — that's the measure's own signature block,
  already drawn with the stave (which is what `getClef` reads).
- The change's beat comes from the **next note's own `measureBeat`**, not from a running sum
  of the durations before it, because `measureBeat` already rewinds a `<backup>` — which is
  how a grand staff writes its lower staff's clef (upper notes, backup, `<attributes>
  <clef number="2">`, lower notes). That block belongs at beat 0, not at the measure's end.
- A block trailing the *last* note lands at the measure's end beat and engraves as the
  courtesy clef before the barline.

```ts
/** Mid-measure `<clef>` changes for `staff` (default '1'), in order: the beat each lands
 *  on and the clef itself. Excludes the measure's leading `<attributes>` (see getClef).
 *  A block after the last note lands at the measure's end beat — the courtesy clef. */
clefChanges(staff?: string): Array<{ beat: number; clef: Clef }>
```

Two things fall out for free once this exists, so add them:

```ts
/** The clef in effect at the END of this measure for `staff`: its last mid-measure change
 *  if it has one, else the clef it opened with. What the NEXT measure compares against to
 *  decide whether to reprint. */
clefAtEnd(staff?: string): Clef | null
/** The beat this measure's content runs out to: the latest onset+duration across voices. */
get endBeat(): number
```

*Callers:* `src/engraving/score-reader.ts:608-703, 1294-1303`.

### 3.6 `Tuplet` display attributes

vexml reads five raw attributes/children off a `<tuplet>` marker to decide what to print.

```ts
get placement(): 'above' | 'below' | null
/** The `bracket` attribute; null when unstated (leave it to the renderer's own rule). */
get bracket(): boolean | null
/** `show-number`: 'actual' | 'both' | 'none'; null when unstated. */
get showNumber(): 'actual' | 'both' | 'none' | null
/** `show-type`: same shape. */
get showType(): 'actual' | 'both' | 'none' | null
/** `<tuplet-actual>` / `<tuplet-normal>`: the numbers PRINTED, which can differ from the
 *  `<time-modification>` ratio (a "7:5" label over a 3:2 compression). Null when the
 *  marker states none — the consumer falls back to `Note.timeModification`. */
get actual(): { number: number | null; type: NoteType | null; dots: number } | null
get normal(): { number: number | null; type: NoteType | null; dots: number } | null
```

*Caller:* `src/engraving/spanner-builder.ts:320-360, 540-600`.

### 3.7 `lineType` on the line-drawing spanners

`line-type` (`solid`/`dashed`/`dotted`/`wavy`) is a stroke instruction a renderer needs.
`Slur` and `Tie` don't expose it; vexml reads `s.getAttribute('line-type')`.

Add `get lineType(): string | null` to `Slur`, `Tie`, `Glissando`, `Slide`, `Bracket`,
`OctaveShift`.

*Caller:* `src/engraving/spanner-builder.ts:1588`.

### 3.8 `Note.gracesBefore`

The run of grace notes immediately preceding a note in its measure — what a player sounds
just before it. Grace notes steal no timeline time, so they never surface as an onset of
their own and can't be found through the `Cursor`. vexml does
`note.parent?.childrenOfType(MNote)` then walks backward, which is the only remaining
`childrenOfType` call in the codebase.

```ts
/** The grace notes ornamenting this note, in play order: the run of `<grace/>` notes
 *  immediately preceding it in its measure. Empty for most notes. */
get gracesBefore(): Note[]
```

*Caller:* `src/elements/note.ts:105-125`.

---

## 4. `color` — a cross-cutting attribute with no home

MusicXML puts an optional `color` on nearly every printable element, and it is written
`"#RRGGBB"` or `"#AARRGGBB"` — **alpha first**, which CSS/canvas doesn't understand. Any
consumer that reads it raw and hands it to a rendering context draws the wrong color. vexml
has a `colorOf(element: MElement | null)` helper doing the normalization, called with four
different raw elements.

Normalize once, in mdom, and surface it on the typed nodes:

```ts
/** The MusicXML `color`, normalized to a CSS color. MusicXML writes "#RRGGBB" or
 *  "#AARRGGBB" — alpha FIRST — so the eight-digit form drops its alpha rather than
 *  handing a renderer the wrong color. Null when unset. */
get color(): string | null
```

At minimum on: `Note` (covers everything the note draws), the `notehead` shape (§1.2),
`Stem`, `Beam`, `Lyric`, `Direction`, `Accidental`, `Barline`.

While you're in `Note`: `<stem>` is currently a bare direction string, so a stem color has
nowhere to live. Either add `Note.stemColor: string | null`, or promote `<stem>` to a small
typed element with `direction` + `color`.

*Caller:* `src/engraving/note-translator.ts:396-445`.

Also add `get editorial(): boolean` to `Accidental` — `<accidental editorial="yes">` prints
the same as `bracket="yes"` and is one raw attribute away from the three flags already
surfaced. (`src/engraving/note-translator.ts:1065-1070`.)

And `get printObject(): boolean` to `Note` — a note marked `print-object="no"` holds its
tick so the other voices stay aligned but draws nothing. Exporters lean on this heavily for
spacer notes, so drawing them puts noteheads on the page that shouldn't be there.
(`src/engraving/note-translator.ts:332`.)

---

## 5. Structural operations

These are the cases where a consumer isn't *reading* around a gap but *building* around one,
with `new MElement(tag)` and manual child ordering. They're the last things keeping
`MElement` in vexml's imports.

### 5.1 `Part.insertMeasureAt` + `Measure.copySignaturesFrom`

vexml inserts blank "gap" measures (non-musical spacers) into a parsed document. It has to
construct a bare `Measure`, set the `number` attribute by hand, `insertBefore` it, then copy
the effective clef/key/time of the displaced measure staff by staff — because a gap inserted
before measure 0 sits before every declaration and would otherwise render a bare, clefless
stave.

```ts
/** Insert a new `<measure>` at `index` (appending when index === measures.length).
 *  Numbering is the caller's to set — a spacer measure legitimately wants none. */
insertMeasureAt(index: number, opts?: { number?: string }): Measure
```

```ts
/** Copy into this measure the clef/key/time in effect at the start of `source`, for every
 *  staff of the part. Idempotent; never overwrites what this measure already declares.
 *  Mid-score this is redundant (signatures carry forward through an empty measure) — it
 *  matters for a measure inserted BEFORE every declaration. */
copySignaturesFrom(source: Measure): void
```

*Caller:* `src/gaps.ts:58-116`.

### 5.2 `Measure.materializeSignatures()` — the slicing primitive

vexml's CLI extracts a measure range into a standalone file. The kept opening measure must
inherit the signatures the dropped measures established, or it renders wrong on its own.
Doing that means ~95 lines of raw `MElement` work: walking backward through every earlier
measure's `<attributes>` blocks nearest-first, honoring "a numberless key/time/staff-details/
transpose applies to every staff so nothing further back in that tag can still apply" (but
*not* for clefs, which match a single staff exactly), creating an `<attributes>` block
positioned before the first note, and re-sorting its children into schema order.

Every one of those rules is MusicXML semantics that mdom already implements privately in
`attributesBackFrom` / `appliesToStaff`. Surface the operation:

```ts
/** Write into this measure's leading `<attributes>` every carried attribute that was in
 *  effect just before it — the signatures earlier measures established. Never overwrites
 *  what this measure already declares. Creates and positions the `<attributes>` block
 *  (before the first note) and keeps its children in schema order.
 *
 *  This is what makes a measure renderable in isolation: the operation a slice, an excerpt,
 *  or a single-measure preview needs. */
materializeSignatures(): void
```

Cover the carried set: `divisions`, `key`, `time`, `clef`, `staves`, `staff-details`,
`transpose`, `part-symbol`, `measure-style`. Preserve the numberless-means-all-staves rule
and the clef exception.

A `MusicXMLSerializer` already exists, so with this the whole CLI slice becomes
`part.measures.filter(...).forEach(m => m.remove())` plus one
`first.materializeSignatures()`.

*Caller:* `cli/slice.ts:130-226` (`hoistAttributes`, `leadingAttributes`, `openAttributes`,
`sortChildren`, `CARRIED`, `GLOBAL`, `ATTRIBUTE_ORDER`).

---

## 6. Acceptance

You're done when, in the vexml repo:

```sh
grep -rn "MElement\|MNode" src cli
```

returns nothing, and

```sh
grep -rn "\.children\b\|\.child(\|\.childrenNamed(\|\.childrenOfType(\|\.closest(\|\.getAttribute(" src cli
```

returns nothing that reaches into mdom.

Ship it as `0.2.0`. Update the README with the new elements, and note in the changelog which
of §1's fixes change existing behavior (§1.4 and §1.5 will change rendered output — that's
the point, but consumers should know).

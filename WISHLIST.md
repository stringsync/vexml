# Upstream wishlist for `@stringsync/mdom`

Audience: the agent working on `@stringsync/mdom`. Each item below is a place where
vexml drops down to the escape hatches (`child()`, `childrenNamed()`, `getAttribute()`,
raw `children` walks) because the typed node doesn't carry the data. Each item names
the MElement subclass the accessor should live on, the exact return type, and the
vexml call site that defines the required semantics. Follow the existing mdom getter
conventions: attribute defaults applied, `null` for absent, spanners resolved via
`partner`/`members` like `Slur`.

## `Note`

- [ ] `Note.notehead: { value: NoteheadValue; parentheses: boolean } | null`
  where `NoteheadValue = 'normal' | 'x' | 'diamond' | 'slash' | 'triangle' | 'cross' | 'circle-x' | 'none'`
  (the MusicXML notehead-value enum — extend as needed, but a closed union, not `string`).
  `null` when the note has no `<notehead>`. `parentheses` is the `parentheses="yes"` attribute
  (ghost note), default false.
  ```xml
  <note>
    <pitch><step>E</step><octave>4</octave></pitch>
    <duration>256</duration><type>quarter</type>
    <notehead parentheses="yes">x</notehead>
  </note>
  ```
  Replaces: `note-translator.ts:73` (`isXNotehead`), `note-translator.ts:82` (`isParenthesized`).

- [ ] `Note.fermata: 'upright' | 'inverted' | null`
  From `<notations><fermata>`. The `type` attribute, defaulting to `'upright'` when the
  element is present without one; `null` when there is no `<fermata>`.
  Replaces: `note-translator.ts:153-157`.

- [ ] `Note.arpeggiate: { direction: 'up' | 'down' | null } | null`
  From `<notations><arpeggiate>`. Outer `null` = no element; inner `direction: null` = element
  present with no `direction` attribute (an undirected roll — a real, distinct rendering), so
  don't collapse the two nulls into one.
  ```xml
  <notations><arpeggiate direction="down"/></notations>
  ```
  Replaces: `note-translator.ts:176-180`.

- [ ] `Note.graceSlash: boolean`
  True when `<grace slash="yes"/>` (acciaccatura — slashed stem); false for a plain
  `<grace/>` (appoggiatura) or a non-grace note. Companion to the existing `isGrace`.
  Replaces: `note-translator.ts:526`.

- [ ] `Note.isHarmonic: boolean`
  Presence of `<notations><technical><harmonic>`. (The harmonic subtypes — `<natural/>`,
  `<artificial/>` — are not needed yet; a bare presence boolean is enough.)
  Replaces: `note-translator.ts:65`.

- [ ] `Note.bend: { semitones: number; release: boolean } | null`
  From `<notations><technical><bend>`. `semitones` is the `<bend-alter>` value (decimal,
  e.g. `2` = whole step, `1` = half); `release` is the presence of a `<release/>` child
  (bend-then-release). `null` when there is no `<bend>`.
  ```xml
  <notations><technical>
    <bend><bend-alter>2</bend-alter><release/></bend>
  </technical></notations>
  ```
  Replaces: `note-translator.ts:276-283`.

- [ ] `Note.otherTechnical: string[]`
  Text of each `<notations><technical><other-technical>` child, in document order
  (free text like `P.M.` for palm mute). Empty array when none.
  Replaces: `note-translator.ts:287`.

- [ ] `Note.hammerOns: HammerOn[]` and `Note.pullOffs: PullOff[]`
  New spanner classes for `<notations><technical><hammer-on>` / `<pull-off>`, with the
  standard spanner shape (`number: string` defaulting `'1'`, `type: 'start' | 'stop'`,
  `note: Note`, `partner`, `members`). vexml currently only checks presence
  (`spanner-builder.ts:685-694`), but the pairing machinery already exists for Slur/Tie —
  reuse it rather than shipping a presence boolean that gets outgrown.
  ```xml
  <notations><technical><hammer-on number="1" type="start">H</hammer-on></technical></notations>
  ```

- [ ] `Note.slides: Slide[]` and `Note.glissandos: Glissando[]`
  New spanner classes for `<notations><slide>` and `<notations><glissando>`, standard
  spanner shape (`number` default `'1'`, `type: 'start' | 'stop'`, `note`, `partner`,
  `members`). Pairing must resolve across measures (a slide can cross a barline) —
  same part-wide scan as `Slur.partner`. vexml treats the two tags identically, but keep
  them separate classes so the distinction survives.
  ```xml
  <note>...<notations><slide number="1" type="start" line-type="solid"/></notations></note>
  <note>...<notations><slide number="1" type="stop" line-type="solid"/></notations></note>
  ```
  Replaces: `spanner-builder.ts:335-352` (manual number/type pairing loop).

## `Direction`

The Direction docstring says dynamics/words/metronome are deferred — these are the ones
vexml needs now.

- [ ] `Direction.metronome: { beatUnit: NoteType; dots: number; perMinute: string | null } | null`
  From `<direction-type><metronome>`. `beatUnit` is the `<beat-unit>` text (the existing
  `NoteType` union — `'quarter' | 'half' | ...`); `dots` counts `<beat-unit-dot/>` children;
  `perMinute` is the `<per-minute>` text kept as a string (MusicXML allows `"ca. 120"`),
  `null` when absent. `null` overall when the direction carries no metronome.
  ```xml
  <direction placement="above">
    <direction-type>
      <metronome>
        <beat-unit>quarter</beat-unit>
        <beat-unit-dot/>
        <per-minute>120</per-minute>
      </metronome>
    </direction-type>
    <sound tempo="180"/>
  </direction>
  ```
  Replaces: `score-reader.ts:194-199` (which also currently drops beat-unit dots — see the
  ponytail note there).

- [ ] `Direction.soundTempo: number | null`
  The `tempo` attribute of this direction's `<sound>` child, parsed to a number
  (quarter notes per minute); `null` when there is no `<sound>` or no `tempo`.
  Replaces: `score-reader.ts:200`.

- [ ] `Direction.words: string[]`
  Text of each `<direction-type><words>` child, in document order (e.g. `ritardando`,
  `dolce`). Empty array when none. (Attributes like `placement`/`font-style` are not
  needed yet; if you want to future-proof, return `{ text: string }[]` objects instead.)
  Replaces: `score-reader.ts:216`.

- [ ] `Direction.nextNote: Note | null` and `Direction.previousNote: Note | null`
  The nearest non-`<chord/>`-member `Note` after / before this `<direction>` in document
  order within the same measure. Directions sit between notes and apply to a neighbor:
  a pedal start binds to the note that follows, a pedal stop to the note that precedes.
  vexml hand-rolls this walk over `measure.children` at `score-reader.ts:232-258`
  (`pedalsOf`); with these two getters plus `Pedal.line` below, that whole method
  collapses to reading `measure.directions`.

## `Pedal`

- [ ] `Pedal.line: boolean`
  The `line="yes"` attribute (bracket-style pedal line vs. the default `Ped…*` signs),
  default false.
  ```xml
  <direction><direction-type><pedal type="start" number="1" line="yes"/></direction-type></direction>
  ```
  Replaces: `score-reader.ts:242`.

## `Barline`

- [ ] `Barline.ending: { type: 'start' | 'stop' | 'discontinue'; number: string } | null`
  From the `<ending>` child. `number` stays a raw string — it is a list/range like
  `"1,2"` or `"1-3"`, and the consumer parses it (`sequence-factory.ts:274-288`).
  `null` when there is no `<ending>`.
  ```xml
  <barline location="left"><ending number="1,2" type="start"/></barline>
  <barline location="right">
    <bar-style>light-heavy</bar-style>
    <ending number="1,2" type="stop"/>
    <repeat direction="backward"/>
  </barline>
  ```
  Replaces: `sequence-factory.ts:297-299`.

- [ ] `Barline.repeatTimes: number | null`
  The `times` attribute of the `<repeat>` child, parsed to a number; `null` when there is
  no `<repeat>` or no `times` attribute (MusicXML's implied default is 2 — leave applying
  that to the consumer, matching how `repeat` already returns the raw direction).
  ```xml
  <barline location="right"><repeat direction="backward" times="3"/></barline>
  ```
  Replaces: `sequence-factory.ts:304`.

## `Harmony` (new class)

`<harmony>` is currently untyped — vexml's `harmoniesOf` (`score-reader.ts:268-294`)
detects it with `child.tag === 'harmony'` and reads every field through escape hatches.

- [ ] New `Harmony extends MElement` class, registered with the parser for `<harmony>`,
  exported from the package index.

- [ ] `Harmony.root: { step: string; alter: number | null } | null`
  From `<root>`: `step` is the `<root-step>` text (`'A'`–`'G'`), `alter` the `<root-alter>`
  value in semitones (decimal; typically `-1 | 0 | 1`), `null` when no `<root-alter>`.
  Note: an explicit `<root-alter>0</root-alter>` (print a natural sign) must stay
  distinguishable from an absent one — hence `number | null`, not defaulting to 0.

- [ ] `Harmony.kind: { value: string; text: string | null } | null`
  From `<kind>`: `value` is the element text (the MusicXML kind-value enum:
  `'major' | 'minor' | 'dominant' | 'major-seventh' | ...` — type it as the closed union
  from the spec), `text` is the `text` attribute (the printed suffix, e.g. `7(b9)`),
  `null` when unset.

- [ ] `Harmony.bass: { step: string; alter: number | null } | null`
  From `<bass>` (slash chord): `<bass-step>` / `<bass-alter>`, same shape and
  null-semantics as `root`. `null` when there is no `<bass>`.

- [ ] `Harmony.frame: Frame | null`
  The typed `Frame` child, or `null`.

- [ ] `Harmony.nextNote: Note | null`
  The nearest non-`<chord/>`-member `Note` after this harmony in document order within
  the same measure — the note the chord symbol sits above. Same semantics as
  `Direction.nextNote`. Replaces the pending/lead walk in `score-reader.ts:281-292`.

- [ ] `Measure.harmonies: Harmony[]`
  The measure's `<harmony>` children in document order (sibling to the existing
  `directions` / `barlines` getters).

  Full example:
  ```xml
  <harmony>
    <root>
      <root-step>E</root-step>
      <root-alter>-1</root-alter>
    </root>
    <kind text="7(b9)">dominant</kind>
    <bass>
      <bass-step>B</bass-step>
      <bass-alter>-1</bass-alter>
    </bass>
  </harmony>
  <note>...</note>  <!-- Harmony.nextNote -->
  ```

## `Frame`

`Frame` exists but only exposes `width`/`height`; the musical content is read raw in
`frameOf` (`score-reader.ts:76-124`).

- [ ] `Frame.strings: number`
  `<frame-strings>` text as a number (MusicXML requires it; if absent/malformed, 6 is the
  sensible default — guitars).

- [ ] `Frame.frets: number`
  `<frame-frets>` text as a number (also required by the spec).

- [ ] `Frame.firstFret: number | null`
  `<first-fret>` text as a number; `null` when absent (absence is meaningful — vexml
  derives a box position from the fretted notes, `score-reader.ts:96-102`).

- [ ] `Frame.frameNotes: FrameNote[]`
  New `FrameNote extends MElement` class for `<frame-note>`, with:
  - `string: number` — `<string>` text (1 = highest-pitched string)
  - `fret: number` — `<fret>` text (0 = open string)
  - `barre: 'start' | 'stop' | null` — the `type` attribute of the `<barre>` child,
    `null` when there is no `<barre>`

  ```xml
  <frame>
    <frame-strings>6</frame-strings>
    <frame-frets>4</frame-frets>
    <first-fret>3</first-fret>
    <frame-note><string>5</string><fret>3</fret><barre type="start"/></frame-note>
    <frame-note><string>4</string><fret>5</fret></frame-note>
    <frame-note><string>3</string><fret>5</fret></frame-note>
    <frame-note><string>2</string><fret>5</fret></frame-note>
    <frame-note><string>1</string><fret>3</fret><barre type="stop"/></frame-note>
  </frame>
  <!-- string 6 has no frame-note: muted ('x' in the diagram) -->
  ```
  Replaces: `score-reader.ts:81-123`.

## `Part`

- [ ] `Part.partSymbol: 'none' | 'line' | 'bracket' | 'brace' | 'square' | null`
  The first `<attributes><part-symbol>` declared in any of the part's measures (the
  connector joining a multi-staff part's staves); `null` when never declared. It is
  effectively a per-part constant, so a Part-level getter beats a per-measure
  carry-forward here.
  ```xml
  <attributes>
    <divisions>256</divisions>
    <staves>2</staves>
    <part-symbol>bracket</part-symbol>
  </attributes>
  ```
  Replaces: `draw-pass.ts:137-148`.

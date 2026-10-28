# Renderer timing investigation, 2026-10-28

alphaTab does substantially less CPU work on this corpus, even when it imports every
part and measure. The samples do **not** establish an equivalent-engraving speed ranking.
Its models retain essentially all pitched notes, but notation, spacing, labeling and
styling differ. Vexml also has measurable implementation costs that are independent of
those differences: repeated whole-part metadata scans dominate its quartet profile.
Its final interaction index and playback timeline are comparatively small costs.

The historical quartet alphaTab result was a blank PNG and remains invalid. All three
engines' full quartet and symphony PNGs now exceed the capture budget and are rejected.
Their mount profiles below are useful CPU evidence, **not successful end-to-end renders**.

## Evidence and reproduction

- [profiling-results.json](profiling-results.json): all three ordinary samples per cell,
  model/source counts, dimensions, font state, diagnostic wall spans and CPU summaries.
- [profiling-cpu.tar.gz](profiling-cpu.tar.gz): original Chrome CPU profiles for each mount
  and each supported capture. Extract into a temporary directory and load a `.cpuprofile`
  in Chrome DevTools' JavaScript Profiler. Inclusive entries in the JSON union recursive
  frames of the same name; unrelated functions sharing a name can still be combined.
- [Debussy opening](profiling-debussy.png) and [quartet opening](profiling-quartet.png):
  crops from the ordinary captures, columns vexml / OSMD / alphaTab. These are inspected
  evidence, not accepted screenshot baselines. Both source scores are CC0.

From the repository root, the measured commands were:

```sh
./bin/vex perf debussy --corpus benchmarks/complete-scores/scores
bun benchmarks/complete-scores/profile.ts run
```

The second command writes ordinary PNGs, raw `results.json` and `.cpuprofile` files into
`/tmp/vexml-renderer-profile`; `--output` changes it and `--samples` accepts 3–5. It is
deliberately outside `vex test` and the merge gate. No lint, masks or attribution capture
is requested. alphaTab's existing glyph-group instrumentation is still in its injected
script, as it is for ordinary rendering; its setup is outside the warm samples, and its
small per-glyph group operations remain part of drawing. This is not a comparison with
an unmodified standalone alphaTab deployment.

The run used rendering/slicing sources at `a7169fbf7d8b04f496f8e8e5abc4566534865329`,
plus this task's initial profiling implementation `8ac677a1b1e86300bd58f719e89ee80412dd2943`.
That task commit was subsequently rebased; the rendering source revision remains an
ancestor on master. The historical audit used `60e28c171e81f370aae5f1b0626570de97438e2b`.
The later inherited-span slicing fix `797cb70f` is included in the final tooling but was
**not in these measurements**. In particular, do not use the old middle-quartet slice's
octave lines to diagnose the complete score. Reproducing those precise slice inputs
requires the slicer and `measure-slicer.ts` dependencies from `a7169fbf`; a new run with
the current slicer is a new observation, not an update to this evidence.

Host: Apple M4 Max, macOS 26.6.2 arm64, Bun 1.4.4. Playwright 1.61.1 uses its bundled
Chromium 149.0.7827.55, revision 1228. Installed engines: vexml 1.13.1 (workspace source),
VexFlow 5.0.0, mdom 0.8.0, OSMD 2.1.1, alphaTab 1.8.4; webappwiz 0.0.52. These are host
observations, with other work possible on the machine, not Docker baseline timings.
Upstream score revisions and XML SHA256s are pinned in [manifest.json](manifest.json).

One Chromium process and one reusable tab per engine serve the sequential run. Each
engine first renders `note.musicxml`; then each selected input gets three ordinary
renders, followed by a separate CPU-profiled diagnostic. This warms browser startup,
bundling and the initial font, but the **first encounter with each score** can still pay
for JIT, new glyph/font ranges and caches. There is no claim of independent cold trials
or of stable medians for the two full long-score mounts (one diagnostic each). Reference
adapters construct a fresh engine instance and replace the score container's children on
each mount; they reuse the tab and its process, fonts and code caches. No per-cell heap
isolation or memory-leak attribution was attempted.

All engines use the existing 900 CSS-pixel reference width, 16-pixel screenshot padding,
964 × 600 initial viewport and measured DPR 1. Vexml's progressive option is explicitly
false, `stretchSingleSystem: false`, `minLastSystemFill: 1`. OSMD disables autoResize and
headers and honors source system/page breaks. alphaTab uses SVG, `useWorkers: false`,
`enableLazyLoading: false`, `enablePlayer: false`, and `load(bytes, [-1])`; the diagnostic
confirms selected track counts 2 / 2 / 2 / 4 / 18. Settings are not pixel-equivalent:
each engine may add breaks, choose different spacing or interpret notation differently.

Vexml awaits its font loader and the rare-glyph readiness pass; alphaTab awaits
`renderFinished` with lazy loading disabled and its embedded Bravura face loaded. OSMD
uses SVG music outlines (no registered webfont in the observed font set). Google Fonts
requests are blocked by the common browser adapter; text uses locally available fallback
faces. All diagnostic `document.fonts.status` values are `loaded`; vexml's unused split
Bravura face can still be `unloaded`. No extra `document.fonts.ready` wait was added to
change the production timing contract. Actual fallback text-face identity was not
instrumented, so typography and host timing should not be generalized to other hosts.

## Ordinary samples and diagnostic boundaries

Milliseconds; ordinary columns are **median (minimum to maximum), n=3**. The mount/capture pair is
from one **additional CPU-profiled render**, not components of the ordinary median.
Profiling and inspection can perturb the browser; do not add these spans to reconstruct
an ordinary sample. Reads, PNG writes, startup and evidence collection are outside the
timed spans. Ordinary `render()` includes adapter input preparation and capture; diagnostic
mount excludes `mountInput()` preparation but includes browser-side compatibility rewrites.

| Complete song | Engine | Ordinary render + PNG | Diagnostic mount / capture | PNG size |
| --- | --- | ---: | ---: | --- |
| Clara | vexml | 365 (359–426) | 215 / 141 | 932 × 8,069 |
| Clara | OSMD | 269 (256–323) | 127 / 123 | 932 × 6,214 |
| Clara | alphaTab | 218 (214–241) | 50 / 148 | 932 × 7,058 |
| Debussy | vexml | 534 (509–881) | 318 / 186 | 932 × 11,853 |
| Debussy | OSMD | 418 (411–459) | 217 / 194 | 932 × 11,426 |
| Debussy | alphaTab | 376 (373–397) | 70 / 297 | 932 × 11,106 |
| Schubert | vexml | 1,271 (1,238–1,336) | 877 / 395 | 932 × 27,973 |
| Schubert | OSMD | 934 (903–1,014) | 542 / 332 | 932 × 21,538 |
| Schubert | alphaTab | 605 (601–651) | 171 / 419 | 932 × 22,532 |

The separate `vex perf` Debussy observation was 545 / 450 / 401 ms for vexml / OSMD /
alphaTab, respectively. It warms by rendering that input once, whereas the profiling
harness first warms with a small note. The profiling harness's first vexml Debussy
sample was 881 ms, followed by 534 and 509. That is consistent with first-score work
inflating the historical 928 ms observation, but font/JIT/cache effects were not isolated
and the source revisions differ. The original 928-versus-395 ratio is not a stable
steady-state ratio established by these samples.

Long-score windows use **1-based source positions**, counting pickups and all movements;
they never expand repeats or match ambiguous printed labels. Standalone slicing removes
repeat/navigation jumps. These are small workload samples, not substitutes for complete
score mount timings or proof that an inherited span renders correctly in context.

| Source window | vexml median (range) | OSMD median (range) | alphaTab median (range) |
| --- | ---: | ---: | ---: |
| Quartet 1–8 | 133 (117–265) | 100 (100–104) | 90 (88–98) |
| Quartet 423–430 | 91 (89–130) | 84 (82–88) | 79 (73–83) |
| Quartet 846–853 | 83 (83–132) | 76 (74–79) | 68 (65–70) |
| Beethoven 1–8 | 198 (158–308) | 116 (115–164) | 109 (106–176) |
| Beethoven 248–255 | 175 (175–201) | 142 (141–143) | 137 (131–170) |
| Beethoven 495–502 | 175 (166–227) | 157 (152–162) | 108 (108–109) |

| Complete long score | Engine | Single diagnostic mount | Requested PNG size | Capture |
| --- | --- | ---: | --- | --- |
| Quartet | vexml | 7,776 | 932 × 176,657 | rejected |
| Quartet | OSMD | 15,354 | 932 × 150,808 | rejected |
| Quartet | alphaTab | 852 | 932 × 150,022 | rejected |
| Beethoven | vexml | 5,486 | 932 × 254,057 | rejected |
| Beethoven | OSMD | 6,113 | 932 × 146,664 | rejected |
| Beethoven | alphaTab | 828 | 932 × 171,254 | rejected |

The 33,554,432-device-pixel limit also covers the expanded viewport. A rejection has
no successful capture duration, no ordinary samples, and no fabricated end-to-end time.
No conclusion about nonblank full-long-score pixels follows from a nonempty model.

## What the stage evidence actually measures

The safe common boundaries are `mount()` and `PlaywrightTab.screenshot()`. Mount includes
import, font readiness, engraving and initial display construction. Screenshot includes
viewport expansion, two animation frames, any resulting tile paint, browser rasterization
and PNG capture/encoding, then viewport restoration. It is **not just PNG compression**.
Vexml records drawing operations and paints canvas tiles; the references build SVG. Their
native style/layout/paint and browser compositor work cross these boundaries differently.

No additional hooks split engine-private layout from drawing. The Chrome profiles provide
sampled attribution inside mount; they are not exact stage stopwatches. Their recording
windows also include DevTools start/stop/dispatch work outside the wall span, often visible
as `(program)` or `(idle)`. Do not normalize the whole profile duration to mount time or
attribute the remaining wall time to one named stage. Native work may appear at the JS
function that triggered it. Inclusive hotspot times overlap and must not be added.

Vexml's synchronous `ScoreEngraver.engrave` children can be distinguished in the saved
bundle by their call frames (line 56227 for that measured bundle). Approximate sampled
milliseconds below are summed by that parent/child relationship, not by the ambiguous
name `build` across the whole bundle. Parse is the separate `DefaultScoreParser.parse`
subtree. Draw includes VexFlow construction/formatting, spill retries, raw geometry
collection and recording; it is not canvas painting alone.

| Vexml workload | Parse | Initial plan | Draw/settle/record | Final model + index | Playback sequence |
| --- | ---: | ---: | ---: | ---: | ---: |
| Debussy | 41 | 33 | 197 | 2 | 4 |
| Quartet | 436 | 704 | 5,776 | 20 | 63 |
| Beethoven | 311 | 399 | 4,146 | 25 | 40 |

Sampling can miss a short stage entirely; zero/unobserved is not free work. These values
exclude some font/async display work. Geometry collected *inside drawing* is additional
to the final model/index column: quartet `collectGeometry` has about 949 ms inclusive,
partly spent repeating connector/staff queries. It overlaps the hotspot below.

The focused findings are:

- **Vexml staff metadata:** quartet `partsPairTabWithNotation` ≈2,769 ms inclusive,
  `get staveCount` ≈2,767 ms inclusive / 2,533 ms self. Beethoven: ≈1,166 / 1,161 ms
  inclusive. `StavePlan.partsPairTabWithNotation()` repeatedly reads `part.staveCount`;
  mdom's getter searches a part's measures for `<staves>` each time, scanning the entire
  part when the normal one-staff declaration is absent. Calling it from stave drawing,
  connectors and geometry repeats the scan. This is implementation cost, not omitted
  musical features or extra PNG pixels. The sampled stack is a strong target; its whole
  duration is not a promised recoverable saving.
- **Vexml direction offsets:** quartet `wordsOf` ≈906 ms, `offsetBeatsOf` ≈838 ms
  inclusive. `ScoreReader.divisionsAt()` walks the part from the beginning for each
  offset, even when an element has no `<offset>`. The profiles include repeated render
  passes; cache or avoid this read while preserving mid-score division changes.
- **Vexml engraving:** quartet `redraw` ≈1,872 ms inside the 5,776 ms draw subtree.
  VexFlow tickable construction and formatting also recur in layout and drawing.
  Neither repeated work nor spill retries can be removed safely from timing evidence
  alone. Final index and playback construction together are around 83 sampled ms for
  the quartet, about 65 ms for Beethoven: disabling the interaction API is not the
  first optimization justified by this profile.
- **OSMD:** quartet `load` ≈659 ms; `render` ≈13,918 ms inclusive. Skyline calculation
  (`calculateLinesGeometric`) ≈6,558 ms and `correctNotePositions` ≈7,889 ms are nested
  hotspots, not additive costs. Beethoven: load ≈519 ms, render ≈5,114 ms; skyline
  ≈2,465 ms, correction ≈2,457 ms. For Debussy, load ≈56 ms and render ≈137 ms.
  Much of this is spacing/collision work, with SVG/VexFlow drawing mixed in. OSMD's
  private/minified code and native calls prevent a reliable finer layout/paint split.
- **alphaTab:** the adapter itself parses XML, shares system/page breaks across every
  part, removes non-tab tunings and derives missing tab string/fret values, then
  serializes and encodes the input again. The latter two compatibility branches do not
  alter these non-tab scores. The `forAlphatab` subtree is ≈15 ms for Debussy, 178 ms
  for quartet, 133 ms for Beethoven, before alphaTab's own import. `readScore` adds
  ≈5 / 83 / 66 ms. `doLayoutAndRender` is ≈27 / 335 / 392 ms inclusive;
  `_paintSystem` ≈17 / 229 / 280 ms is contained in it. DOM insertion
  (`beginUpdateRenderResults`) and forced visibility/layout (`get isVisible`) are
  important native-work callers too. alphaTab does not build vexml's interaction
  model or sequence, but its disabled player setting does not mean it performs zero
  timing/event preparation: the traces also contain `addEvent`. There is no safe
  separate engraving-versus-painting wall interval in its current event contract.

## Content checks and limits of equivalence

Every full model has the expected measure-column count in every part/staff. The songs
contain voice plus two piano staves, the quartet four staves, Beethoven eighteen.
OSMD retains 994 / 1,460 / 3,197 / 15,658 / 15,261 note/rest source objects. Vexml's
rendered note traversal reports the same counts except Debussy (1,458). alphaTab stores
rests on beats rather than as pitched-note objects, so its lower note count alone is
**not evidence of missing music**:

| Score | Source pitched notes | alphaTab pitched notes | Source / alphaTab lyric-bearing notes or beats |
| --- | ---: | ---: | ---: |
| Clara | 865 | 865 | 94 / 94 |
| Debussy | 1,221 | 1,221 | 154 / 154 |
| Schubert | 2,893 | 2,893 | 318 / 318 |
| Quartet | 13,611 | 13,610 | 0 / 0 |
| Beethoven | 10,029 | 10,029 | 225 / 225 |

The one quartet Violin II discrepancy (3,830 source pitched notes versus 3,829 in the
alphaTab model) is the score's only `<cue/>` note: P2 measure 63, voice 2, an E4 16th
with `print-object="no"`, `<stem>none</stem>` and a slur stop. alphaTab 1.8.4's MusicXML
importer returns from note parsing on `<cue>` (`case "cue": return;` in
`alphaTab.core.mjs`), so it never enters the model. The `forAlphatab` rewrites leave
`<cue>` and `print-object` alone. A per-measure diff of source pitch and duration against
the model imported from the raw source finds no other missing or extra pitched note in
any score. The note is hidden, so no engine should draw it: this is no rendering defect
and no missing music on the page. The same diff shows two model differences that change
playback, not drawing, neither traced in alphaTab's code: 17 Schubert and quartet measures
where a beat before a grace note is 120 ticks short (one is 24 short), which looks like
alphaTab taking the grace's time from the previous beat, and Beethoven P5, transposed
`chromatic -2` in measure 1 only, sounding 2 semitones higher than written plus
transpose in 46 measures from measure 49 on, which may be the diff script's fault rather
than alphaTab's. Aggregate
counts cannot prove every pitch, voice, duration, lyric syllable or notation is correct.
Likewise, all-tracks selection and model counts cannot certify the rejected full PNGs.

The pixel review sampled beginning, middle and end of each original short song and the
source-position windows above for the two long scores. Original full-song review crops
used y offsets 0 / 3,734 / 7,449 (Clara vexml), 0 / 5,626 / 11,233 (Debussy vexml),
0 / 13,686 / 27,353 (Schubert vexml); other engines used their own midpoint/end because
system positions differ. Reviewed content included:

- Clara: opening rests and piano figures; vocal lyric syllables and tied/chordal piano
  music around 20–22; closing piano figuration, tied final chords and fermatas at 38–41.
- Debussy: the opening rest/fermata and piano grace note; lyric/slur/chord material around
  34–37; the sustained vocal ending, piano grace note and final rest column at 69–70.
- Schubert: opening triplets, bass entrance and rests; lyric-bearing voice and tremolo
  piano texture around 69–77; recitative, rests, final chords and fermatas at 146–148.
- Quartet: all four parts, tremolos, slurs, rests and cello pizzicato at 1–8; the
  fermata, key change, triplets and sustained lower parts at positions 423–430 (printed
  148–155); accented final chords, rests and fermatas at 846–853 (printed 375–382).
- Beethoven: opening rest-heavy winds plus the short-note motive and fermatas; all
  eighteen parts in model traversal, with upper/lower orchestral parts in the reviewed
  windows; middle sustained fermatas/trill and note runs at 248–255; accidentals,
  chords, short rests and final cutoff at 495–502. Small `a` annotations are lyrics in
  the source and remain visible in the corresponding string/other parts.

These are observed differences, rather than claims that one shorter page lost music:

- Vexml's Debussy opening omits the visible G3 piano grace before the main rest; the
  same source pattern occurs at 69. Those two grace notes exactly match the two absent
  entries in its note traversal. OSMD and alphaTab show the opening grace. This is a
  focused rendering candidate, unrelated to alphaTab doing less work.
- Vexml does not show the opening vocal rest fermata in Debussy, nor the opening
  rest-heavy Beethoven wind fermatas that appear in the reference captures. Omitting
  those glyphs means vexml is also doing *less* work in those regions; it cannot
  explain alphaTab's advantage as wholesale reference omission.
- alphaTab's secondary voices are light gray by default (`secondaryGlyphColor` alpha
  100/255), including much piano bass/inner-voice content. The music is faint, not
  absent. This changes ink density and comparability; it was not normalized silently.
- Quartet two-note tremolos appear with `2:1` tuplet-style labels in alphaTab, rather
  than matching the other engines' beam/tremolo engraving. Schubert's tremolo/triplet
  representation also differs. No per-feature timing ablation was performed.
- alphaTab's lyric typography/spacing differs and source printed labels are normalized
  in the slices. It may fit more measures per system: Debussy's opening has four
  columns in alphaTab, three in OSMD and two in vexml, although all retain 70 columns.
  Vexml's larger vertical gaps are especially visible between eighteen-staff systems.
- The middle-quartet cut has inherited octave-shift boundary differences. It is
  recorded as a **slice limitation**, not a proved complete-score engine defect;
  `797cb70f` subsequently repairs direction-span state in the slicer.

## How much of the disparity is explained

For Debussy, vexml's PNG has only 6.7% more pixels than alphaTab's. The diagnostic
capture actually takes **111 ms less** in vexml (186 versus 297), while its mount takes
**248 ms more** (318 versus 70). Thus extra image pixels do not explain alphaTab's
advantage here. Import/engraving/display-construction cost dominates the direction of
the difference; the ordinary median gap is 158 ms in this run. Exact subtraction across
ordinary and profiled trials would be invalid.

Beethoven's requested vexml image has 48.4% more pixels than alphaTab's, so the old
13,839-versus-2,695 ms end-to-end comparison mixes very different capture workloads.
The new guard prevents measuring that workload safely. The new single mount still
differs by 4,658 ms before capture. Quartet differs by 6,924 ms before capture; repeated
staff-metadata reads account for about 2,767 sampled ms within vexml's mount. These
observations establish substantial implementation cost independently of screenshot
area. They do not partition the historical wall-time gap into precise percentages.

No missing part or missing block of measures explains the alphaTab song speedups.
The one pitched-note discrepancy in the quartet is a hidden cue note alphaTab drops on
import, and there are several definite
notation/styling differences. Their isolated timing contributions are **unmeasured**.
The profiles support narrower follow-ups on repeated metadata/offset scans, rather than
a broad renderer rewrite or disabling the public interaction/playback features.
Font/JIT effects, native painting/encoding costs, altered collision/spacing algorithms
and feature-specific omissions remain hypotheses where no controlled ablation exists.

## Validation and follow-ups

The optional corpus remains unregistered in the default tests. Focused coverage checks
the corpus selector and CPU-profiler recovery after an operation fails. After rebasing
onto the inherited-span slicing and mask-audit fixes, the selected CLI/slice/profile tests passed (96
tests; no screenshot changes). Full checks run in the normal splates merge gate.

Follow-ups are recorded on the task board: #153 caches part staff facts for a render,
#154 avoids repeated direction-offset history scans, #155 investigates the grace notes,
#156 covers rest fermatas, and #157 traced the alphaTab note-count discrepancy to the hidden cue note above.
A separate full-long-score capture design would
be required before reporting new full-score end-to-end medians. The current task does
not raise capture limits or optimize engraving from wall-clock ratios alone.

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
./bin/vex perf debussy --corpus packages/benchmarks/scores
bun packages/benchmarks/profile.ts run
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

## Checkpoint after metadata and offset caching

This is a new comparison between rendering source `6fbeff1a34ee5deab2d80bb20d38c9174b9260c5`
(the parent of both optimizations) and `b9965ed410213d8933a4ba6e2a09152518493c12`
(#153 plus #154). Both sides used profiling implementation
`32c2f0d4625ed02225645b29cb244b603f62118e` and the same current slicer, including
`797cb70f`. Thus the historical pre-slicer-fix numbers above remain untouched and are
not treated as this comparison's baseline. Temporary-worktree workspace links were
isolated so each bundle actually resolved its named vexml source.

- [profiling-checkpoint-results.json](profiling-checkpoint-results.json): revisions,
  settings and warm policy, every ordinary and mount-only sample, input/PNG hashes,
  model evidence, and sampled CPU attribution.
- [profiling-checkpoint-cpu.tar.gz](profiling-checkpoint-cpu.tar.gz): raw full-score
  mount profiles from the first-encounter run (`cold`) and from the diagnostic after
  three mount-only samples (`warm`), on both revisions.

The host, engine versions, 900-pixel reference width, vexml config, DPR 1, font
readiness and capture budget are the same as above. Each process first rendered
`note.musicxml`. Bounded cells then took five ordinary render-plus-PNG samples,
retaining the first encounter with that score. Full scores took three mount-only
samples with no capture, also retaining the first encounter. A later, separate
CPU-profiled mount is not a component of either median. All runs were sequential.

Representative commands (with the full source revision supplied explicitly) were:

```sh
bun packages/benchmarks/profile.ts run --revision <40-hex-revision> \
  --score debussy-mandoline --renderer vexml --ranges all --samples 5 --output <dir>
bun packages/benchmarks/profile.ts run --revision <40-hex-revision> \
  --score dvorak-american-quartet --renderer vexml \
  --ranges 1-8,423-430,846-853 --samples 5 --output <dir>
bun packages/benchmarks/profile.ts run --revision <40-hex-revision> \
  --score beethoven-symphony-5-i --renderer vexml --ranges all \
  --mount-samples 3 --output <dir>
```

The selectors and mount-only sampling are opt-in; mount-only defaults to zero and
no complete-score measurement is part of the default suite.

### Ordinary bounded render plus capture

Milliseconds, median (minimum to maximum), n=5. These include the first encounter;
they are not cold-process trials or stable-distribution estimates. Small differences
in either direction are not attributed to the two metadata changes without a larger
controlled sample.

| Input | 6fbeff1a | b9965ed4 | Current minus baseline |
| --- | ---: | ---: | ---: |
| Debussy complete | 533.5 (515.8–975.1) | 521.9 (502.3–925.8) | -11.5 |
| Quartet 1–8 | 117.1 (116.1–168.0) | 124.7 (117.4–168.9) | +7.6 |
| Quartet 423–430 | 91.8 (89.2–170.0) | 92.5 (90.2–165.8) | +0.7 |
| Quartet 846–853 | 83.1 (82.4–300.0) | 83.7 (82.6–205.8) | +0.6 |
| Beethoven 1–8 | 141.9 (133.8–206.7) | 148.9 (142.0–216.4) | +7.0 |
| Beethoven 248–255 | 159.0 (149.7–260.4) | 158.0 (157.2–264.5) | -1.0 |
| Beethoven 495–502 | 148.8 (141.2–195.4) | 155.6 (149.7–208.2) | +6.7 |

All 35 before/after ordinary capture pairs have exactly equal PNG SHA256s. Each
cell's five hashes are also identical within its revision. Input hashes and the
complete diagnostic evidence match: part IDs, per-part measure/staff/note counts,
container dimensions and text, SVG/canvas counts, DPR and font state. This is direct
pixel and structural evidence for these bounded inputs, not an inference from image
height or an equivalence proof for other scores.

### Full-score mount recovery

Milliseconds, median (minimum to maximum), n=3 mount-only samples. No PNG capture is
included. The first value is the first encounter with the full score; the later two
show why first-encounter and warm costs must not be conflated.

| Full score | 6fbeff1a | b9965ed4 | Recovered at median |
| --- | ---: | ---: | ---: |
| Quartet | 7,232 (6,929–13,903) | 3,585 (3,384–6,851) | 3,647 ms / 50.4% |
| Beethoven | 5,102 (4,776–9,486) | 3,718 (3,391–7,548) | 1,383 ms / 27.1% |

The separate warm CPU diagnostics measured quartet mounts of 7,140 versus 4,021 ms
and Beethoven mounts of 4,842 versus 3,499 ms. They corroborate the direction of the
mount-only medians but remain single profiled observations. Both revisions' full
captures were rejected by the unchanged 33,554,432-device-pixel budget at the same
932 × 176,657 and 932 × 254,057 requested sizes. There is no new full-score
end-to-end timing or screenshot claim; full part/measure/note evidence did match.

### Warm sampled attribution

Approximate inclusive milliseconds from the warm diagnostic after three mount-only
samples. Recursive names are unioned per sample. These values overlap, are not
additive, and include no normalization of profile recording time to wall mount time.

| Path | Quartet 6fbeff1a → b9965ed4 | Beethoven 6fbeff1a → b9965ed4 |
| --- | ---: | ---: |
| `partsPairTabWithNotation` | 2,624 → 1 | 1,100 → 0 |
| `offsetBeatsOf` | 859 → 2 | 0 → 0 |
| `divisionsAt` | 859 → 0 | 58 → 0 |
| `collectGeometry` | 913 → 35 | 359 → 18 |
| Initial `plan` | 658 → 323 | 344 → 302 |
| `drawNext` | 5,230 → 2,117 | 3,496 → 2,359 |
| `redraw` within settling | 1,694 → 673 | 1,145 → 781 |
| `tickables` | 819 → 757 | 718 → 717 |
| `formatAndDraw` | 552 → 587 | 346 → 332 |
| `resolveSystem` | 282 → 309 | 637 → 725 |

The recovered staff and direction work persists after warming; it is not just a
first-render artifact. The large geometry-collection reduction overlaps the removed
staff scans and must not be added to them as independent savings. In contrast,
tickable construction, formatting, spill redraws and spanner settling remain.

The current warm `tickables` call sites split into approximately 196 / 195 ms in
layout, 378 / 332 ms in initial drawing and 182 / 163 ms in redraws for quartet /
Beethoven. `ScoreEngraver.create` already shares one `VoiceTranslator` instance
between layout and drawing. The repeated cost is its per-voice tickable and VexFlow
object construction, not repeated translator construction. Initial and retry costs
also overlap the inclusive `redraw` totals.

For current Beethoven, `buildSlurs` accounts for about 334 sampled ms,
`buildGlissandos` 170, `buildWavyLines` 118 and `buildTies` 93. Quartet's
`clearWedge` is about 62 ms. These are nested attribution clues, not independent
recoverable totals or proof that a collision check can be skipped.

### Go / no-go for the later lane

- **#160, stable preparation: go, with a bounded immutable/render-scoped reuse
  target.** The remaining 717–757 ms of tickable work and its layout/draw split are
  still material after both fixes. Do not cache the already-shared translator or
  share mutable formatted VexFlow tickables without proving reset, font, document
  revision, stave placement and redraw behavior. Measure reduced duplicate work as
  well as wall time.
- **#161, system overflow retries: go for retry-cause instrumentation and one
  evidenced invariant-reuse target.** Current `redraw` is still 673 / 781 ms, roughly
  a third of each `drawNext` subtree. The existing one-system-at-a-time settling is
  correct; this is not evidence for removing retries, weakening spill checks or
  changing convergence.
- **#173, spanner resolution: go for the proposed scan investigation, especially on
  Beethoven.** `resolveSystem` remains about 725 ms there and 309 ms in the quartet,
  with substantial slur, glissando, wavy-line and tie construction underneath. The
  profile does not yet identify a safe algorithmic change or prove quadratic work.
- **Broad collision-policy or interaction/playback ablation: no-go.** The profiles
  do not justify it, and the lane requires identical placement, geometry, source
  identities and playback. The exact bounded PNG comparisons are the acceptance
  standard for the next changes, not a reason to update baselines for a faster diff.

No engraving optimization was made in this checkpoint. Its code changes are limited
to opt-in profiling selectors, input/output evidence and mount-only sampling.

## No-go: render-scoped chord preparation reuse

A bounded experiment at `be37bcd48b4a6ba27f83db0daffd0b9ec65fb74d` cached plain
`ChordTranslator` constructor inputs and key-line metrics against baseline `4a4c778b`.
It never shared VexFlow tickables: each layout, draw and spill retry still built fresh notes,
modifiers and voices. Clef, octave shift, centering, slash form and both stem inputs keyed the
cache, and starting a render cleared it, including progressive and font-residency retries.

- [profiling-reuse-preparation-results.json](profiling-reuse-preparation-results.json):
  revisions, settings, every sample, input/PNG hashes, content evidence and duplicate-read
  counters. Both bounded cells used the checkpoint's 900-pixel reference width, vexml config,
  DPR 1, font readiness and capture guard. Each process warmed `note.musicxml`; five ordinary
  render-plus-PNG samples retained the first encounter. Runs were sequential, baseline then
  current, with no full-score measurement.

Milliseconds, median (minimum to maximum), n=5:

| Input | Baseline | Preparation reuse | Current minus baseline |
| --- | ---: | ---: | ---: |
| Debussy complete | 515.8 (509.6–942.9) | 511.2 (496.7–925.7) | -4.6 |
| Quartet 423–430 | 92.0 (90.0–168.9) | 98.6 (92.1–182.1) | +6.6 |

The separate diagnostic mounts were 310.7 → 313.5 ms for Debussy and 28.9 → 28.7 ms for the
quartet cell. These single observations are not medians and agree with the ordinary samples:
there is no consistent material engraving gain. The small improvement is below the spread,
while the dense cell did not improve.

Every sample's PNG SHA256 matched within and across revisions. Part IDs, measure/staff/note
counts, dimensions, canvas counts, DPR and loaded font state also matched. Focused counters
showed that two equal pitched-note builds saved one of four duration reads, equal key-line
lookups made one VexFlow key-properties read instead of two, and reset or changed inputs forced
recomputation. They also proved fresh note and key-array identities. Thus duplicate work did
fall, but the saved plain-data preparation is not a worthwhile share of mount time.

**No-go for this target.** The experiment and its focused tests were removed rather than landed
as a speculative refactor. The profile still does not justify sharing mutable, formatted VexFlow
tickables across passes. No rendering source, screenshot, geometry or collision behavior changes
result from this investigation.

## System settling: no ahead draw for a system nothing wraps onto

`SystemDraw` settles one system at a time, and that stays. Counting its work headlessly at the
checkpoint's 900-pixel width and vexml config showed that almost every system is redrawn: the
quartet 326 of 327, Beethoven 112 of 112, Debussy 33 of 33. Every redraw had observed stave spill,
sometimes with stepped lyrics, top overflow or stacked hairpins. Those redraws are the settling
working as designed and are not removed.

The duplicate was the next system. It was drawn ahead before this one was weighed, because a
slur or hairpin wrapping off this system is drawn and measured with the next. A redraw then
rewound it, and the next round drew it again: one full system draw discarded per redraw, 325 in
the quartet. Since baseline `cd63908c`, `SpannerResolver.reachesPast` asks whether any spanner a
later system draws reaches back onto this one: a start whose partner is drawn later, a hairpin or
pedal still open, or an ottava or bracket/dashes line crossing the break. When none does, the
system is weighed first and, when it needs room, redrawn before the next is drawn at all. A
reach-only test was not enough: in Debussy a span it misses raised a stave row by 69 px.

- [profiling-system-settling-results.json](profiling-system-settling-results.json): revisions,
  settings, every sample of both browser runs, PNG hashes, content evidence, headless counts and
  the equivalence summary.

**Output.** A throwaway harness rendered the 239 integration fixtures in standard 900 px, standard
360 px, paged and documentLayout 'follow', plus the five complete scores, through both drivers.
Every snapshot's element model, geometry and timeline matched. Every op's call, path, bounds,
transform, clips and dash matched. The only differences were inherited canvas state that the
op never reads (a font on a stroke, a line width on a fill) and renumbered paint element ids:
the discarded ahead draw used to leave both behind for the redraw. In the browser, all 35
bounded captures have identical PNG hashes before and after, with equal content evidence.

**Duplicate work removed.** Headless draws per render: quartet 652 → 428, Beethoven 223 → 203,
Debussy 65 → 58. Beethoven keeps most of its ahead draws because most of its systems end with
a spanner still open. Headless totals over three sequential samples: quartet 4,158–4,203 →
3,573–3,614 ms, Beethoven 4,725–4,753 → 4,605–4,671, Debussy 459–466 → 437–457.

**Browser timing.** Milliseconds, median (minimum to maximum). Run 1 measured every baseline cell,
then every current cell:

| Input | cd63908c | 0b62c4fa | Current minus baseline |
| --- | ---: | ---: | ---: |
| Debussy complete, n=5 | 459.3 (449.7–820.3) | 499.8 (484.8–901.3) | +40.5 |
| Quartet 1–8, n=5 | 117.0 (107.8–153.8) | 118.1 (116.0–161.8) | +1.1 |
| Quartet 423–430, n=5 | 92.3 (89.7–156.9) | 91.7 (90.9–160.4) | -0.6 |
| Quartet 846–853, n=5 | 79.8 (74.4–182.4) | 82.6 (77.7–195.9) | +2.8 |
| Beethoven 1–8, n=5 | 134.7 (129.2–173.2) | 134.4 (131.7–175.4) | -0.3 |
| Beethoven 248–255, n=5 | 158.0 (148.5–255.1) | 149.8 (149.1–253.2) | -8.2 |
| Beethoven 495–502, n=5 | 146.3 (141.3–171.9) | 153.4 (141.2–199.9) | +7.1 |
| Quartet full, mount only, n=3 | 2,920.7 (2,860.7–5,865.7) | 2,834.2 (2,762.9–5,687.2) | -86.5 |
| Beethoven full, mount only, n=3 | 3,740.5 (3,448.1–7,128.7) | 3,537.2 (3,227.9–6,739.8) | -203.3 |

Run 2 interleaved baseline, current, baseline, current, to test the Debussy rise:

| Round | Debussy cd63908c | Debussy 0b62c4fa | Quartet mount cd63908c | Quartet mount 0b62c4fa |
| --- | ---: | ---: | ---: | ---: |
| 1 | 468.7 (447.1–823.1) | 468.7 (463.2–832.2) | 2,701 (2,666–5,474) | 2,793 (2,701–5,517) |
| 2 | 493.2 (490.6–891.2) | 489.1 (465.9–856.1) | 2,977 (2,973–5,970) | 2,811 (2,806–5,691) |

The Debussy rise was host drift: interleaved, the revisions match. But the quartet's baseline
also moved 276 ms between rounds, more than any difference between revisions. Thus the browser
does not resolve this change's wall-time gain from host noise. The sampled `drawNext` in run 1's
single diagnostic mounts fell 1,722 → 1,566 ms (quartet) and 2,301 → 2,152 (Beethoven), which is
consistent with a few percent, not with the headless 14%. A likely reason, not proven, is that
the discarded ahead draw also warmed text-measurement and glyph caches that the real draw then
reused, and measuring with a real canvas costs more than with the headless fake.

**Remaining gap.** The settling's redraws remain: each system is drawn about twice, the redraw
reserved by what the first draw saw. Removing those would mean predicting spill before drawing,
a spacing change this lane rules out. Tickable construction and formatting inside each draw, and
`resolveSystem` (#173), remain the larger costs.

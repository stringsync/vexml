# Complete-score audit

An optional corpus for rendering, timing, and visual lint reconnaissance. These files are
not integration fixtures and are not registered in the default test suite or merge gate.
The dev site's example picker lists them under **Complete score:** and imports their XML
only when selected. Scores larger than 512 KiB stay in the current session without being
saved into localStorage; reloading returns to the default example.

## Run

From the repository root:

```sh
bun benchmarks/complete-scores/run.ts run
bun benchmarks/complete-scores/run.ts run --score debussy-mandoline --renderer vexml
bun benchmarks/complete-scores/run.ts run --score debussy-mandoline --measures 35-37
```

`--output` defaults to `/tmp/vexml-complete-scores`. A raw PNG, marked PNG, JSON report,
and log are written per score/engine. Each cell runs in its own process with a 180-second
termination timeout. Runs are sequential. Failures are recorded and the next cell proceeds;
exit zero from the overall survey does not mean every cell succeeded. Check the cell JSON
and any `*-failure.json`. Reuse an empty output directory for an independent survey.

The engines are vexml, OSMD, and alphaTab, using the existing renderer adapters. alphaTab's
adapter includes the repository's existing input compatibility adjustments. MuseScore is
not included in this first pass. No screenshot baselines are accepted by this runner.

A small score warms each engine before one timed render-and-PNG capture. The measurement
includes layout, drawing, and PNG capture; it excludes browser startup, input file read,
element-mask capture, and lint. It is not an isolated engraving measurement or a statistical
performance ranking. The second render captures attribution for collision checks.

Above 8 million image pixels, the survey uses **structural lint only**: blank output,
clipping, staff intersections, and stray lines. It explicitly skips element-mask collisions.
This budget avoids the multi-gigabyte SVG mask capture observed on even a short song.
A score of 100 in this mode does **not** mean the notation is collision-free. Three-measure
samples exercise element collisions without adding full-score test costs.

`--measures` uses existing `vex slice` printed-label semantics. In particular, labels repeat
across the quartet's movements. A request for 77-79 selects multiple occurrences; 380-382
uniquely addresses its last three columns. Crossing spans are left open by the current
slicer, so every suspected slice defect must be checked in the original context.

## Sources and provenance

`manifest.json` records pinned upstream URLs/revisions, the original MXL archive and
expanded XML SHA256 hashes, source sizes, encoding software, and the original rights text.
The XML is expanded from the archive without edits. No source score is repaired silently.

| Score | Parts | Measure columns | Note/rest elements |
| --- | ---: | ---: | ---: |
| Clara Schumann: Liebst du um Schönheit | 2 | 41 | 994 |
| Debussy: Mandoline | 2 | 70 | 1,460 |
| Schubert: Erlkönig | 2 | 148 | 3,197 |
| Dvořák: American Quartet, all movements | 4 | 853 | 15,658 |
| Beethoven: Symphony No.5, first movement | 18 | 502 | 15,261 |

Voice and piano count as two parts even though they draw on three staves.

- [OpenScore Lieder](https://github.com/OpenScore/Lieder): the first three scores, CC0.
  Its license is preserved in `lieder-LICENSE.txt`.
- [OpenScore String Quartets](https://github.com/OpenScore/StringQuartets): Dvořák, CC0.
  Its license is preserved in `quartets-LICENSE.txt`.
- [Mark Gotham's Hauptstimme / OpenScore Orchestra](https://github.com/MarkGotham/Hauptstimme):
  Beethoven. The actual score declares **Score: CC0 1.0 Universal; Annotations: CC-By-SA**.
  Keep that attribution and share-alike notice with derived annotated material. The copied
  `orchestra-REPOSITORY-LICENSE.txt` is the repository's MIT license, not a replacement for
  the score's embedded rights statement. Attribution: Mark Gotham and OpenScore Orchestra.

## Initial results, 2026-10-28

Host: Apple M4 Max, macOS 26.6.2 arm64, Bun 1.4.4. These are native-host observations,
not reproducible Docker screenshot baselines. Engine versions and all finding boxes are
recorded in `results.json`; source commit: `60e28c171e81f370aae5f1b0626570de97438e2b`.

| Complete score | vexml render + PNG | OSMD | alphaTab | Full-score lint observation |
| --- | ---: | ---: | ---: | --- |
| Clara Schumann | 408 ms | 313 ms | 231 ms | 96 / 300 / 7 collision flags respectively; all scores saturate at 0 |
| Debussy | 928 ms | 476 ms | 395 ms | No structural findings; collisions not checked on full image |
| Schubert | 2,291 ms | 984 ms | 652 ms | No structural findings; collisions not checked on full image |
| Dvořák | 17,404 ms | 12,469 ms | 2,585 ms | 1 stray line / 6 stray lines / blank capture |
| Beethoven | 13,839 ms | 8,158 ms | 2,695 ms | No structural findings; collisions not checked on full image |

alphaTab's quartet time is the time to produce a **blank** 932 × 150,022 PNG, so it is not
evidence of a successful fast rendering. The raw vexml quartet capture is 932 × 176,657;
Beethoven is 932 × 254,057. Full-image comparisons are expensive in memory as well as time.

### Reviewed findings and small samples

- **Clara Schumann, 11-13:** the slice retains rest/chord-head overlaps and hairpin/note
  contacts. Its counts are 12 vexml, 21 OSMD, 0 alphaTab. The reviewed vexml pixels show a
  rest printed through piano chord heads. Counts are contacts, not distinct root causes.
- **Debussy, 35-37:** vexml reports one words/stem contact in 37; the reviewed image shows
  the `mf` marking intersected by a long stem. alphaTab reports a different, two-pixel
  tie/accidental contact in 35. OSMD reports 19 contacts. These are not equivalent defects.
- **Schubert, 75-77:** vexml and alphaTab report no findings; OSMD reports 31 contacts.
  These counts have not all been manually adjudicated.
- **Dvořák, 380-382:** vexml and alphaTab report none; OSMD reports four contacts.
- **Beethoven, 1-3:** vexml and alphaTab report none; OSMD reports 18 contacts.
- **Dvořák full-score stray-line:** at y=133826, across printed labels 77-80 in the final
  movement. The reviewed crop shows a beam coinciding with the staff line and no obvious
  staff collision. This is a suspected lint false positive, not a confirmed rendering bug.

The linter subtracts a fixed penalty per contact, reaches zero quickly on long scores, and
can flag allowed one-pixel or shared-voice contacts. It is useful for locating candidates;
these numbers do not establish an overall ranking of the engines.

Four original files validate against MusicXML 4.0. The Dvořák file does not: its dynamics
contain an unsupported `<r/>` child at XML line 202494. That input issue is preserved and
reported rather than treated automatically as a vexml bug.

The first three-engine `vex lint` run on Clara took 51.5 seconds and reported maximum
resident set size around 7.5 GB. The isolated alphaTab attributed capture took about
35 seconds, compared with about 0.23 seconds for its ordinary capture. This motivated
bounded optional audits and small collision samples.

## Follow-up lane

Lane 11, **Complete-score rendering quality**, contains tasks 141-148:

- Standalone repeat/navigation boundary policy for `vex slice`.
- Unambiguous selection of repeated measure labels.
- Preservation of inherited spanning notation at cuts.
- Piano rest/chord separation, using a minimal Clara Schumann regression.
- Dynamics/hairpin clearance, using minimal Clara Schumann and Debussy regressions.
- Investigation and regression coverage for suspected beam/staff lint false positives.
- Diagnosis of blank very-tall SVG captures.
- Bounded SVG mask capture for complete-score collision lint.

Tasks include source locations, reproduction details, acceptance criteria, and dependencies.
The rendering tasks must reduce source passages to focused fixtures in the main suite;
the complete scores and performance measurements remain optional. No rendering fixes were
made during this audit.

# Semantic render lint

`./bin/vex lint --input score.musicxml --renderer vexml,osmd,alphatab --semantic`
adds Jev checks to the geometric lint. `--semantic` is opt-in. Without a
`TYPESAFE_API_KEY` in the project or device secret store, the stage is skipped
and the geometric reports still work. The credential is declared in `.wiz/config.ts`.

Each measure is sliced by position and rendered separately by each selected engine.
Its inherited signatures are materialized before the surrounding measures are removed.
This retains lyrics and directions outside staff boxes, and works for MuseScore too.
Images are scaled proportionally and padded to fit 280–1568 pixels on each side.
Findings mark the measure's box in the original image, or the whole original image
when the engine supplies no measure positions. Repeated measure labels have separate
slice indices in the report; their original image boxes conservatively cover every
occurrence of that label.

Every renderer pair gets the same musical-content question. A renderer is flagged
`differs` only when all the others agree with one another and disagree with it.
At least three renderers are needed to assign blame. Ties and uncertain votes do not
produce `differs`. XML-derived questions independently check notes, rests,
accidentals, dots, lyrics, signatures and common markings, producing `missing`.
Unsupported notation is not a complete MusicXML semantic audit. Hidden objects and
hidden lyrics are omitted from the questions.

The JSON records the pinned model, question revision, thresholds, pair probabilities
and each presence question with its probability. API failures fail the command;
an absent credential skips only the optional stage. Jev's image support is experimental.
See TypeSafe's [images](https://docs.typesafe.ai/images.md),
[Noul](https://docs.typesafe.ai/primitives/noul.md) and
[models](https://docs.typesafe.ai/models.md) documentation.

## Calibration

Run `./bin/vex lint --corpus --semantic --output /tmp` to write
`/tmp/semantic-corpus.json`. This makes 59 sequential System One calls on saved
PNG files, with no browser renders. It pins `jev-1.14.0` and `musicxml-v1` and
sweeps thresholds over the saved answers without more API calls.

For every history defect, it compares the before/after region, then compares the
fixed region with itself and with a blank copy. History pairs are **unlabelled
observations**: the corpus labels collisions, and some fixes also changed their XML,
so they cannot establish whether the musical content should match. Only the synthetic
self/blank controls contribute to precision and recall. Presence checks use the
first 24 questions from each of four fixed fixture baselines: fermata,
lyrics_elision, accidentals and rest_measure_typeless, plus blank copies.

The checked-in `semantic-calibration.json` records the 2026-10-26 run: 183
observations, including 17 unlabelled history pairs. At the selected thresholds:

| Check | Cutoff for a finding | True positives | False positives | Recall |
| --- | --- | --- | --- | --- |
| Pair comparison | ≤ 0.3 | 17/17 blank controls | 0/17 self controls | 100% |
| XML presence | ≤ 0.1 | 62/66 blank checks | 0/66 clean checks | 94% |

The presence cutoff was lowered from the documentation's starting 0.3 to avoid
clean-control findings. Renderer agreement still requires ≥ 0.7. These are small,
easy controls used to select an experimental default, not held-out accuracy for
real missing notes or different engraving engines. Individual answers vary between
runs even with a pinned model; the JSON preserves the measured answers.

A one-measure CLI smoke run with vexml, OSMD and alphaTab exercised all three pairs
and their presence questions, returning 100/100 and no findings for each engine.

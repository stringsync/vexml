# Element ink calibration

`bun packages/vex/ink-corpus-capture.ts` rebuilds the historical pairs and current
fixture captures. Both history revisions use the fixture from the fixing commit,
including reproductions introduced by that commit. Each historical mask sidecar
is tied to its PNG by SHA-256. The clean captures embed their PNG and masks together.
The original pixel-only baseline checks remain in the corpus too.

The initial calibration localizes 6 of 17 historical collisions (35%, previously
0%). Eleven remain explicitly `missed`, with reasons in `defects.json`. Every
mask-backed clean finding remains in the precision denominator, including the
40 reviewed contacts recorded in `clean.json`; the reported precision is 13%.
The exceptions prevent existing fixture content from blocking the regression gate,
and do not suppress findings from `vex lint --input`.

Reviewed existing contacts:

| Capture | Contacts |
| --- | --- |
| Historical amazing_grace after | Seven unrelated head, articulation and tie contacts remain after the chord diagram fix. |
| articulations_extended, ornaments | Ornament flourish tips touch a staff line by a few opaque pixels. |
| defaults_appearance | The octave bracket runs through the boxed dolce directive. |
| document_positions | Explicit rehearsal positions overlap the staff and clefs. |
| grace_notes | A grace flag touches a glissando. |
| lyrics_voice_and_piano | Three tuplet marks touch staff lines. |
| Beethoven score | Slur contacts with a stem and a head. |
| Debussy score | Hairpin/text and stem/text contacts. |
| land_der_berge score | Stem/text, slur/stem, slur/text and distinct head/rest contacts. |
| Schubert score | Beam/head, flag/tie and head/text contacts. |
| text_formatting | The authored rotated directive crosses a staff, stem and head. |

Construction contacts (staff/barline joints, stems and heads, beams and stems,
shared unison heads, curves crossing staff lines or barlines) are allowed by kind.
Two different annotations, rests against heads, and separate same-kind elements
still require disjoint opaque pixels. Bounding boxes only select candidates.

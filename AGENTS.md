A bun workspace. `packages/vexml` is `@stringsync/vexml`, the published library, and
everything else exists to build or check it:

| Package                | What it is                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/vexml`       | the library. Source sits flat in `packages/vexml`                                                                                     |
| `packages/vex`         | the `vex` CLI below, plus the xmllint image it drives                                                                                 |
| `packages/site`        | the playground at https://vexml.dev                                                                                                   |
| `packages/integration` | visual-regression tests and their fixtures                                                                                            |
| `packages/renderer`    | repo-private `renderers` factories: MusicXML to pixels via vexml, OSMD, alphaTab, or MuseScore, hiding the browser/Docker underneath |

Read `packages/vexml/AGENTS.md` before hunting through the library: it maps each piece
of notation (slur, volta, lyric, fret) to the files that decide it. Keep it current: a
file added, moved, or renamed under `packages/vexml/` updates the map in the same commit.

Use the splates skill for every change unless told otherwise: do the work in a splates task's
worktree and land it with `splates merge`. Inside a worktree, run `./bin/vex`, not bare `vex`,
which checks the main tree instead.

After making code changes:

- `vex fix` typecheck, format, and lint the project.
- `vex test` test the project.
- `vex test --update` update the test snapshots.
- `bunx @webappwiz/cli scry` check the change against the code style rules in `.wiz/scry`.
  If it says a credential is missing, skip this check rather than asking for one.
  If it says the budget is exhausted, ask the user whether to override the budget, but
  carry on with the rest of the work rather than waiting on the answer.

`packages/site` has no tests, on purpose: they made `vex test` slow and flaky. Don't add any;
check site changes in the running app instead.

MusicXML tools:

- `vex validate --input <path>` validate a MusicXML file.
- `vex render --input <path>` render a MusicXML file to a PNG. Delete screenshots when you are done, unless you're showing the user something.
- `vex lint --input <path> [--renderer vexml,osmd,alphatab,musescore|all]` judge a render from its pixels: a 0..100 score, findings (clipped ink, staves drawn into each other, nothing drawn) with pixel boxes, and the PNG with each finding boxed. Delete its output as you would a screenshot.
- `vex slice --input <path> --measures <list>` extract measures from a MusicXML file into a smaller one.
- `vex coverage` sync `packages/integration/COVERAGE.md` with the MusicXML 4.0 schema and check its fixtures. A change that draws a new element or attribute updates its row.
- `vex perf [pattern]` time the fixtures through vexml, OSMD, and alphaTab, one render each.
- `vex readme` re-record the root README's example images and GIFs into `.github/readme`.

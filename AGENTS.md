A bun workspace. `packages/vexml` is `@stringsync/vexml`, the published library, and
everything else exists to build or check it:

| Package | What it is |
| --- | --- |
| `packages/vexml` | the library. Source sits flat in `packages/vexml` |
| `packages/vex` | the `vex` CLI below, plus the xmllint and MuseScore images it drives |
| `packages/site` | the playground at https://vexml.dev |
| `packages/integration` | visual-regression tests, their fixtures and their harness |

Read `packages/vexml/AGENTS.md` before hunting through the library: it maps each piece
of notation (slur, volta, lyric, fret) to the files that decide it. Keep it current — a
file added, moved, or renamed under `packages/vexml/` updates the map in the same commit.

After making code changes:

- `vex fix` typecheck, format, and lint the project.
- `vex test` test the project.
- `vex test --update` update the test snapshots.

MusicXML tools:

- `vex validate --input <path>` validate a MusicXML file.
- `vex render --input <path>` render a MusicXML file to a PNG. Delete screenshots when you are done, unless you're showing the user something.
- `vex slice --input <path> --measures <list>` extract measures from a MusicXML file into a smaller one.

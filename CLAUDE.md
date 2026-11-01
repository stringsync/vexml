This is the public mirror of vexml, which is developed in a larger private repository and pushed
here on each release. Change it here only for a fix you mean to send back as a pull request.

`packages/vexml` is `@stringsync/vexml`, the published library, and everything else exists to build
or check it:

| Package                | What it is                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `packages/vexml`       | the library. Source sits flat in `packages/vexml`                                   |
| `packages/vex`         | the `vex` CLI below, plus the xmllint image it drives                               |
| `packages/site`        | the playground at https://vexml.dev                                                 |
| `packages/integration` | visual-regression tests and their fixtures                                          |
| `packages/benchmarks`  | the complete-score audit and profiling scripts, and the scores they run on          |
| `packages/renderer`    | MusicXML to pixels via vexml, OSMD, alphaTab, or MuseScore, hiding Docker underneath |
| `packages/core`        | shared utilities, copied in from the private repository                            |

Run `bin/vex` (here, the repository root), not a bare `vex`.

After making code changes:

- `bin/vex fix` typecheck, format, and lint the project.
- `bin/vex test` test the project. The integration tests render in Docker.
- `bin/vex test --update` update the test snapshots.

`packages/site` has no tests, on purpose; check site changes in the running app instead.

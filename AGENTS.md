Read `src/AGENTS.md` before hunting through `src/`: it maps each piece of notation
(slur, volta, lyric, fret) to the files that decide it. Keep it current — a file added,
moved, or renamed under `src/` updates the map in the same commit.

After making code changes:

- `vex fix` typecheck, format, and lint the project.
- `vex test` test the project.
- `vex test --update` update the test snapshots.

MusicXML tools:

- `vex validate -i <path>` validate a MusicXML file.
- `vex render -i <path>` render a MusicXML file to a PNG. Delete screenshots when you are done, unless you're showing the user something.
- `vex slice -i <path> -m <list>` extract measures from a MusicXML file into a smaller one.

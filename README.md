# vexml

https://vexml.dev

The monorepo. The library everything else exists to serve lives in
[`packages/vexml`](packages/vexml); its README is what npm shows.

| Package | What it is |
| --- | --- |
| [`packages/vexml`](packages/vexml) | `@stringsync/vexml` — the published library |
| `packages/vex` | the `vex` dev CLI, and the Docker images it drives |
| `packages/site` | the playground at https://vexml.dev |
| `packages/integration` | visual-regression tests and their harness |

## Development

Dependencies:

- [bun](https://bun.sh)
- [docker](https://docs.docker.com/desktop/)

Add the repo's `bin/` to your `PATH` so the `vex` command works anywhere:

```sh
profile=~/.${SHELL##*/}rc # ~/.zshrc, ~/.bashrc, etc.
echo "export PATH=\"$PWD/bin:\$PATH\"" >> "$profile"
source "$profile"
```

Then:

```sh
vex dev                     # run the playground site
vex render --input song.musicxml # render a MusicXML file to a png
```

Don't want it on your `PATH`? Run it directly with `./bin/vex <command>`.

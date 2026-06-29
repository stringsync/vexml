# vexml

https://vexml.dev

## Getting Started

Install the package.

```sh
npm install @stringsync/vexml
```

Import the `render` function.

```ts
import { render } from '@stringsync/vexml';
```

Render MusicXML.

```ts
const res = await fetch('song.musicxml');
const musicXML = await res.text();
await render(musicXML, element);
```

Render MXL (compressed MusicXML).

```ts
const res = await fetch('song.mxl');
const mxl = await res.blob();
await render(mxl, element);
```

Use custom fonts (optional).

> [!IMPORTANT]
> Font `family` and `url` are interpolated into a `<style>` rule and CSS variables. vexml
> strips quote/backslash/angle/newline characters as a backstop against CSS injection (it's
> not script-executing XSS), but this is not full CSS escaping. Treat font config as
> developer-controlled; don't pass raw untrusted user input.

```ts
await render(musicXML, element, {
  fonts: {
    // noteheads, clefs, rests, accidentals, etc., default is Bravura
    notation: { family: 'Petaluma' },
    // part/instrument names, lyrics, titles, directions (default is Source Sans 3);
    // optionally specify a font url if it's not already available locally
    text: { family: 'Inter', url: '/fonts/inter.woff2' },
  },
});
```

## Listening to events

`render` resolves to a `Score`. Subscribe with `addEventListener` (and unsubscribe with
`removeEventListener`). Pointer events carry the `target` under the pointer — a `Note`,
`Measure`, or `TabPosition`, or `null` over empty space.

```ts
const score = await render(musicXML, element);

score.addEventListener('pointermove', (e) => {
  if (e.target?.type === 'note') {
    console.log(e.target.getPitch()); // e.g. "C/5"
    e.target.halo.on(); // highlight it on an overlay
  }
});
```

Available events: `pointermove`, `pointerdown`, `pointerup`, `click` (each with `target`,
`point` in score space, and the raw `native` event), plus `scroll` and `resize`. Call
`score.dispose()` when done to remove the render and its listeners.

## Development

The `vex` CLI (`bin/vex`) wraps the dev tasks. It needs [bun](https://bun.sh).
Add the repo's `bin/` to your `PATH` so `vex` works anywhere:

```sh
export PATH="$PWD/bin:$PATH" # run from the repo root; add to your shell profile to persist
```

Then:

```sh
vex dev                     # run the playground site (localhost:5174)
vex fix                     # format, lint, and typecheck (--check to verify only)
vex test                    # run unit + visual-regression tests in Docker
vex render -i song.musicxml # render a MusicXML file to a png
```

Don't want it on your `PATH`? Run it directly with `./bin/vex <command>`.

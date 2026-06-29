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
const res = await fetch('song.musicxml'); // or .mxl
const musicXML = await res.text();        // or .blob() for mxl
await render(musicXML, element);
```


## Listening to events

```ts
const score = await render(musicXML, element);

let previous = null;

score.addEventListener('pointermove', (e) => {
  const current = e.target?.type === 'note'
    ? e.target
    : null;
  if (current !== previous) {
    previous?.halo.off();
    current?.halo.on();
    previous = current;
  }
});
```

## Using custom fonts

> [!NOTE]
> Font `family` and `url` are interpolated into a `<style>` rule and CSS variables. Don't pass raw untrusted user input.

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

## Adding a canvas layer

```ts
const score = await render(musicXML, element);

const layer = score.createLayer('content');
// ctx is a standard CanvasRenderingContext2D, you can draw anything you want here
layer.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
layer.ctx.fillRect(50, 50, 100, 80);
```

## Cleaning up

When you're done with a layer or the entire rendered score, call `.dispose()` to clean up resources.

```ts
layer.dispose();
score.dispose();
```

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
vex render -i song.musicxml # render a MusicXML file to a png
```

Don't want it on your `PATH`? Run it directly with `./bin/vex <command>`.

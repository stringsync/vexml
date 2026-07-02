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
    current?.halo.on('rgba(41, 98, 255, 0.35)');
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

## Gap measures

A gap is a non-musical measure inserted into the score: an empty stretch of stave with an optional label and fill, occupying a fixed amount of playback time regardless of tempo. Use gaps to sync notation to media where the music pauses — e.g. an instructor talking before the piece starts.

```ts
const score = await render(musicXML, element, {
  gaps: [
    {
      beforeMeasureIndex: 0,      // a source-document measure index
      durationMs: 8000,           // plays for exactly 8s
      label: 'What are pitches?', // optional centered text
      minWidth: 250,              // optional width floor in px
      style: { fill: 'rgba(255, 255, 255, 0.65)' }, // optional overlay
    },
  ],
});
```

`beforeMeasureIndex` refers to the MusicXML as written, so gaps never shift each other; the measure count appends after the last measure. In the rendered score, each gap occupies a measure **index** of its own and shifts the measures after it right by one — but measure **numbers** (the printed labels) are untouched, and the gap itself shows none.

Read the resulting timing with `score.getGaps()`, which returns `{ measureIndex, label, startMs, endMs }` per gap in the same order they were passed — `gaps[i]` in is `getGaps()[i]` out, so join by position to line the score up with your media. Playback treats a gap like any other measure: the cursor glides across it and `getMeasureIndexAtMs` resolves into it.

## Adding a canvas layer

A layer is a `<canvas>` that you can draw arbitrary content on without affecting the sheet music. vexml controls its size and position.

```ts
const score = await render(musicXML, element);

const background = score.addLayer('content', -1); // draws behind the score
// ctx is a standard CanvasRenderingContext2D
background.ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
background.ctx.fillRect(50, 50, 100, 80);

const foreground = score.addLayer('content', 1); // draws in front of the score
foreground.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
foreground.ctx.fillRect(50, 50, 100, 80);
```

Pass an optional `zIndex` to order a layer relative to the canvas the score is drawn on, which sits at `zIndex` 0. A positive value draws in front; a negative value draws behind, showing through the score's transparent pixels. Layers with the same `zIndex` stack in the order they were created.

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

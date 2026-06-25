# vexml

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

## Development

```sh
bun link # install the mdom command
mdom
```

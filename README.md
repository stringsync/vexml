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
    // noteheads, clefs, rests, accidentals, etc.
    music: { family: 'Petaluma' },
    // optionally specify a font url
    labels: { family: 'Inter', url: '/fonts/inter.woff2' },
    // lyrics, titles, and directions
    text: { family: 'EB Garamond' },
  },
});
```

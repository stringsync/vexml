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

## Development

```sh
bun link # install the mdom command
mdom
```

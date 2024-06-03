# src

`vexml` is composed of:

- [musicxml](./musicxml/README.md): Organize data from a MusicXML document so that it can be read easily in TypeScript.
- [mxl](./mxl/README.md): Organize data from a MXL document so that it can be read easily in TypeScript.
- [rendering](./rendering/README.md): Take MusicXML data and transform it into `vexflow` objects.
- [drawables](./drawables/README.md): Extend `vexflow`'s drawing capabilities.
- [spatial](./spatial/README.md): Provide data structures for spatial contexts.
- [events](./events/README.md): Exposes user interaction hooks.
- `util`: Miscellaneous functionality that doesn't neatly fit into either library or needs to be shared.

[src/vexml.ts](./vexml.ts) is the entrypoint for MusicXML rendering.

# src

`vexml` is composed of:

- [components](./components/README.md): Wraps simple HTML operations.
- [data](./data/README.md): Declares the data input for the rendering engine.
- [debug](./debug/README.md): Provides basic debugging utilities.
- [elements](./elements/README.md): Wraps the rendering engine output.
- [errors](./errors/README.md): Houses vexml errors.
- [events](./events/README.md): Provides utilities for pubsub-like communication.
- [formatting](./formatting/README.md): Formats data documents to different schemes.
- [musicxml](./musicxml/README.md): Makes MusicXML data more ergonomic.
- [mxl](./mxl/README.md): Makes MXL data more ergonomic.
- [parsing](./parsing/README.md): Transforms different music encodings to a data document.
- [playback](./playback/README.md): Provide data structures for playing a rendering.
- [rendering](./rendering/README.md): Transforms a data Document into `vexflow` objects.
- [schema](./schema/README.md): Reifies TypeScript types.
- [spatial](./spatial/README.md): Provides data structures for spatial algorithms.
- `util`: Miscellaneous functionality.

- [config.ts](./config.ts): Declares the central configuration.
- [render.ts](./render.ts): Orchestrates vexml components to render.

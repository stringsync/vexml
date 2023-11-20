# mxl

The `mxl` library is responsible for interfacing with [MXL](https://www.w3.org/2021/06/musicxml40/tutorial/compressed-mxl-files/) compressed files.

## Intent

### Goals

- **DO** provide an interface for getting data from an MXL archive.
- **DO** artifically flatten the XML structure of a MXL document.
- **DO** conform data from the MXL document to reasonable defaults when needed.

### Non-goals

- **DO NOT** map 1:1 TypeScript classes to MXL elements.
- **DO NOT** mutate data in a MXL document.
- **DO NOT** parse its MusicXML data into `musicxml` elements.

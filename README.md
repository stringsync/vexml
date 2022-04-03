# vexml

This library is a proof-of-concept spawned from [stringsync/musicxml#1](https://github.com/stringsync/musicxml/issues/1).

## Development

### Running Locally

```
yarn
yarn dev
```

This will run `webpack-dev-server` at http://localhost:8080, open a browser, and render all the examples in the [manfiest](dev/public/manifest.json). Anytime the `vexml` source code changes or an example changes, the examples will automatically reload.

### MusicXML Examples

In order to add a MusicXML example:

1. Add the xml file to [dev/public/examples](dev/public/examples) directory.
2. Add the name of the xml file to the [dev/public/manifest.json](dev/public/manifest.json).

You can focus a particular example by appending `#example-name.json` to the URL.

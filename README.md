# vexml

[MusicXML](https://www.w3.org/2021/06/musicxml40/) to [VexFlow](https://www.vexflow.com/).

![test workflow](https://github.com/stringsync/vexml/actions/workflows/test.yml/badge.svg)

## Usage

### Installing

You _will_ be able to use any JavaScript package manager (e.g. `yarn`, `npm`, `pnpm`) to install `vexml`. At the moment, `stringsync/vexml` is not published to any public registry.

### Rendering

```ts
import { vexml } from 'vexml';

const width = 600;
const height = 600;

const div = document.createElement('div');
div.style.width = `${width}px`;
div.style.height = `${height}px`;

const xml = 'some valid musicXML'; // see dev/public/examples for valid musicXML documents

vexml.Vexml.render({ element: div, width: width, xml: xml });
```

This will render a child SVG element whose height will automatically adjust to fit the container. There is currently no option to disable this.

## Development

### Installing

Before you run any commands, you must use `yarn` to install the dependencies.

```
yarn
```

### Running Locally

```
yarn dev
```

This will run `webpack-dev-server` at http://localhost:8080 by default. When visited, the app will render all the examples in [dev/public/examples](dev/public/examples).

### Adding MusicXML Examples

In order to add a MusicXML example, add the xml file to [dev/public/examples](dev/public/examples) directory. You may need to manually reload the page.

### Running Tests

In order to run tests, run:

```
yarn test
```

This is just an alias for `jest`, so you use all the [jest CLI options](https://jestjs.io/docs/cli). For example, to run in watch mode:

```
yarn test --watchAll
```

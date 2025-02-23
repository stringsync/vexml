# vexml

![test workflow](https://github.com/stringsync/vexml/actions/workflows/test.yml/badge.svg)

[Demo](https://vexml.dev)

`vexml` is an open source library that renders [MusicXML](https://www.w3.org/2021/06/musicxml40/) using [vexflow](https://github.com/vexflow/vexflow).

## Usage

### Installation

```sh
npm install @stringsync/vexml
```

> [!NOTE]  
> I recommend you to lock into a specific version to avoid breakages due to `vexml` API changes.

### ⚠️ IMPORTANT: Loading Fonts

`vexml` uses `vexflow` 5^, which requires you to load the fonts you need to use. See the [vexflow](https://github.com/vexflow/vexflow) repo for more information.

### Rendering

Rendering requires you to provide a valid MusicXML string and an `HTMLDivElement`.

```ts
import * as vexml from '@stringsync/vexml';

const musicXML = 'some valid musicXML string';
const div = document.getElementById('my-id');
const score = vexml.renderMusicXML(musicXML, div);
```

You can also render MXL given a `Blob` input.

```ts
import * as vexml from '@stringsync/vexml';

const mxl = new Blob(['some', 'valid', 'mxl', 'bytes']);
const div = document.getElementById('my-id');
const scorePromise = vexml.renderMXL(musicXML, div);
// From here, you need to await or call then() on the scorePromise to extract the score.
```

## Advanced Usage

### Config

To see an exhaustive list of configuration options, see [config.ts](./src/config.ts). You can experiment with all configs on dev site or [vexml.dev](https://vexml.dev).

### Events

The event listening API is similar to `EventTarget.addEventListener`, except you need to save a reference to the returned handle to unsubscribe.

```ts
const score = vexml.renderMusicXML(musicXML, div);

const handle = score.addEventListener('click', (e) => {
  console.log(e);
});

// ...

score.removeEventListener(handle);
```

Events work the same for both canvas and svg backends.

### Cursors

Cursors mark a position in a rendered vexml score. You can step through a piece entry-by-entry or seek a specific timestamp.

- **Add** a cursor _model_ for the part you're interested in.
- **Render** a cursor _component_ to the score's overlay.
- **Listen** update the component to react to model changes.

```ts
import * as vexml from '@stringsync/vexml';

// ...

const score = vexml.renderMusicXML(musicXML, div);

// Add
const cursorModel = score.addCursor();

// Render
const cursorComponent = vexml.SimpleCursor.render(score.getOverlayElement());

// Listen
cursorModel.addEventListener(
  'change',
  (e) => {
    cursorComponent.update(e.cursorRect);
    // The model infers its visibility via the cursorRect. It assumes you've updated appropriately.
    if (!cursorModel.isFullyVisible()) {
      cursorModel.scrollIntoView(scrollBehavior);
    }
  },
  { emitBootstrapEvent: true }
);
```

See [Vexml.tsx](./site/src/components/Vexml.tsx) for an example in React.

### Custom Rendering

`renderMusicXML` is the standard way to orchestrate `vexml` objects. If you need more grannular control, you need to do the following:

- **Declare** a `vexml` configuration.
- **Parse** the MusicXML into a vexml data document.
- **Format** the vexml data document.
- **Render** the formatted vexml data document.

```ts
import * as vexml from '@stringsync/vexml';

// Declare
const config = { ...vexml.DEFAULT_CONFIG, WIDTH: 600 };
const logger = new vexml.ConsoleLogger();

// Parse
const parser = new vexml.MusicXMLParser({ config });
const document = parser.parse(musicXML);

// Format
const defaultFormatter = new vexml.DefaultFormatter({ config });
const monitoredFormatter = new vexml.MonitoredFormatter(defaultFormatter, logger, { config });
const formattedDocument = monitoredFormatter.format(document);

// Render
const renderer = new vexml.Renderer({ config, formatter: monitoredFormatter, logger });
const score = renderer.render(div, formattedDocument);
```

> [!IMPORTANT]  
> I highly recommend you pass the same config object to all vexml objects. Otherwise, you may get unexpected results.

See [render.ts](./src/render.ts) and [Vexml.tsx](./site/src/components/Vexml.tsx) for more examples.

### Gap Measures

Gap measures are non-musical fragments that optionally have a label. This is useful when syncing a `vexml` cursor with media that has non-musical pauses in it (e.g. a video of a teacher explaining a musical concept).

![gap measure example](https://github.com/user-attachments/assets/11023cbb-3d20-4405-a5c6-95f36585dd93)

You should create these right after you parse a document, specifically before format you it. Otherwise, the gap may invalidate the format's output.

```ts
// ...

const parser = new vexml.MusicXMLParser({ config });
const document = parser.parse(musicXML);

// Insert the gap measure **before** formatting.
document.insertGapMeasureBefore({
  absoluteMeasureIndex: 0,
  durationMs: 5000,
  minWidth: 500,
  label: 'What are pitches?',
  style: {
    fontSize: '16px',
  },
});

const formatter = new vexml.DefaultFormatter({ config });

// render, etc.
```

## Development

### Prerequisites

You need [docker](https://docs.docker.com/engine/install) to run the integration tests.

### Installing

Before you run any commands, install the dependencies.

```sh
npm install
```

### Running the Dev Server

In order to run a dev server that hot reloads `vexml` changes, run:

```sh
npm run dev
```

You should be able to "save" MusicXML documents in localstorage using the dev app, which will cause the documents to survive refreshing the page.

### Running Tests

In order to run tests on x86 architecture, run:

```sh
npm run test
```

If you're running a machine using ARM architecture (such as an M series mac), try setting the default platform before running the command (or set it in your shell profile):

```sh
export DOCKER_DEFAULT_PLATFORM=linux/amd64
```

These commands are just an alias for `jest`, so you use all the [jest CLI options](https://jestjs.io/docs/cli). For example, to run in watch mode:

```
npm run test -- --watchAll
```

To bypass Docker, run:

```
npm run jest
```

This will cause snapshots to be saved to `tests/integration/__tmp_image_snapshots__`, which is ignored by git. **It is important that you run it for the first time on a branch without any changes.** Doing this on a dirty branch could cause you to have an incorrect snapshot, which may cause problems when developing.

If you suspect issues with the tmp snapshots, run the following command to retake the snapshots (which is scripted to do this at origin/master):

```
npm run resnap
```

### Debugging Tests

To run a debugger, run:

```
npm run debug
```

If you're using VSCode, open the debugging tool and launch `Attach to Process`. You can set breakpoints in VSCode or insert `debugger` statements to cause execution to pause.

If you're not using VSCode, open Chrome and visit chrome://inspect. You should see a virtual device that starts with `./node_modules/.bin/jest` with an "inspect" button. Clicking this will allow you to use the Chrome debugger.

If you're still having issues, check the jest [docs](https://jestjs.io/docs/troubleshooting) or file an issue.

### Snapshots

This library uses [americanexpress/jest-image-snapshot](https://github.com/americanexpress/jest-image-snapshot) for image-based snapshot tests.

#### Diffs

You can see diff images in the `__diff_output__` directory (nested under `__image_snapshots__`). Images here are ignored by git, but allow you to see what changed. The order of images are: snapshot, diff, received.

#### Updating Snapshots

Rendering varies by platform, so it is important you run tests using the `npm run test*` commands, since that runs tests in a consistent environment (via Docker). This is also the environment that CI will use.

When you want to update all snapshots, rerun the test command with the `--updateSnapshot`.

```sh
npm run test -- --updateSnapshot
```

If you want to only update a single snapshot from specific test, you can use [`--testNamePattern`](https://jestjs.io/docs/cli#--testnamepatternregex).

#### Removing tests

When removing a test, it is important to remove the corresponding snapshot. There is currently no automatic mechanism to do this. Alternatively, you can run the `vexml:latest` Docker image with `JEST_IMAGE_SNAPSHOT_TRACK_OBSOLETE=1`, but make sure you're running the entire test suite. See the [docs](https://github.com/americanexpress/jest-image-snapshot#removing-outdated-snapshots) for more information.

### Publishing

You can publish a `vexml` version by running the release script:

```sh
npm run release [alpha|beta|rc|patch|minor|major]
```

It should create the git tags needed to create a release on GitHub.

## Design

### Rendering Hiearchy

The rendering hiearchy is the most important data structure in `vexml`. The tree-like structure is what allows `vexml` to query data efficiently in the data document instead of manually passing data directly from a node to its ancestors.

> [!NOTE]  
> You can visualize most of these structures on [vexml.dev](https://vexml.dev) by enabling the `DEBUG_DRAW_*` options.

#### `Score`

Score is the root of the hiearchy. It contains many systems and non-musical engravings such as the title.

![system](https://github.com/user-attachments/assets/8789e09e-5230-40c5-afd6-c836e185466d)

#### `System`

System represents a collection of formatted measures across all parts.

![score](https://github.com/user-attachments/assets/39470030-93e3-4d82-876c-d35301a6844d)

#### `Measure`

Measure represents a collection formatted fragments across all parts.

![measure](https://github.com/user-attachments/assets/ddcb9470-4fb9-4af9-b11c-2e28e80611ec)

#### `Fragment`

Fragment represents a collection of parts formatted together. It is a music section with a distinct fragment signature (see [data/types.ts](./src/data/types.ts) for what makes a fragment signature). It is necessary because there are some elements that vexflow can only render one of per stave (e.g. start clef). Fragment also contains some non-musical elements, such as part labels.

![fragment](https://github.com/user-attachments/assets/509dbee1-c34b-4d57-8224-4decdfa7dace)

#### `Part`

Part is a _fragment-scoped_ music section that usually corresponds to an instrument. It contains many staves.

![part](https://github.com/user-attachments/assets/431b51b0-ddf7-47b7-a32a-a6c1f3b9a446)

#### `Stave`

Stave is a container for voices.

![stave](https://github.com/user-attachments/assets/1d1e3cc7-4ff0-4479-a3b7-d06e5ee54ca6)

_Shown here are stave intrinsic rects._

#### `Voice`

Voice represents a collection of entries. There can be multiple voices per stave.

![voice](https://github.com/user-attachments/assets/07ae834b-947d-4d70-a19f-e6ef3a38ae4e)

#### `Voice Entry`

Voice entry is anything rendered within a voice. Some common examples are notes and rests.

![voice entry](https://github.com/user-attachments/assets/0f13c5b3-6143-450b-a43e-31ed5ef4505b)

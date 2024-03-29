# rendering

The `rendering` library is responsible for transforming `musicxml` structures into `vexflow` structures.

## Intent

### Goals

- **DO** be the "glue" between `musicxml` and `vexflow`.
- **DO** make formatting decisions on how to render a MusicXML document given a `width` constraint.
- **DO** calculate a data structure that allows callers to hook into the resulting `vexflow` elements.

### Non-goals

- **DO NOT** map 1:1 with `musicxml` or `vexflow` structures.
- **DO NOT** override defaults already covered by `musicxml` (unless it's configurable).
- **DO NOT** maintain state that _significantly_ diverges from the MusicXML document.

## Design

### Rendering Lifecycle

1. **parse**: A MusicXML document is parsed using the `musicxml` library.
2. **render**: `vexflow` elements are created from the rendering hierarchy.

### Rendering Hierarchy

The rendering hierarchy is a unique data structure that is a _mixture_ of:

- MusicXML
- `vexflow`
- Music Theory

Each of these sub-hierarchies do not overlap 1:1, which makes it extremely difficult to reason how the structures map to each other. The complexity is amplified by how they use similar names to represent different things.

For example, take the term "System". [`vexflow.System`](https://github.com/0xfe/vexflow/blob/master/src/system.ts) seems to actually be concerned with how a measure is drawn _for a specific part_. `vexml` takes an approach to [opensheetmusicdisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Music-Sheet-Object-Model) where the system is composed of _all of the measures_ for _all of the parts_ on a horizontal plane. The latter approach seems to align with how MusicXML views [systems](https://www.w3.org/2021/06/musicxml40/musicxml-reference/examples/system-distance-element/).

The rendering hierarachy is also intended to break down the rendering logic in reasonably maintainable chunks. If any component becomes difficult to maintain or is error-prone. Consider decomposing it into smaller chunks.

While developing this library, avoid relationships between distant ancestors and descendants. However, sometimes this is necessary. For example, a relationship in `rendering` is:

- A `System` has many `Measures`.
- A `Measure` belongs to a `System`.
- A `Measure` has many `MeasureFragments`.
- A `MeasureFragment`belongs to a `Measure`.
- A `System` has many `MeasureFragments` through `Measures`.

### Immutability

While not a strict requirement, prefer making the state accumulated from the **create** stage private and immutable. Anything that is dynamic can likely be passed down during the **render** stage. This allows the code to be easier to reason about.

### Lazy Load

When possible, prefer to make heavy calculations lazy and memoizable. Use the [util.memoize](../util/decorators.ts) function to make this opaque to callers.

### Testing

**DO** add integration tests in [tests/integration](../../tests/integration) to test the `rendering` library. Rely on image snapshot testing to prevent regressions.

**DO NOT** write unit tests for the `rendering` library. Unit testing these kind of tests seems expensive and error prone.

### Object Namespaces

You may notice how some types use namespaces.

The `musicXML` key serves as a namespace:

```ts
class Stave {
  /** Creates a Measure. */
  constructor(opts: {
    config: Config;
    musicXML: {
      measure: musicxml.Measure;
    };
  }): Measure {
    // implementation
  }
}
```

The `vexflow` key serves as a namespace:

```ts
/** The result of rendering a Stave. */
export type StaveRendering = {
  type: 'stave';
  staveNumber: number;
  width: number;
  vexflow: {
    stave: vexflow.Stave;
  };
  voices: VoiceRendering[];
};
```

This is intentionally done to make it easier to use objects from different libraries use the same name. The namespace makes the calling code easier to understand.

A contribed example that uses variable names:

```ts
class Stave {
  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(): number {
    if (this.voices.length === 0) {
      return 0;
    }
    const vfVoices = this.voices.map((voice) => voice.render().vexflow.voice);
    const vfFormatter = new vexflow.Formatter();
    return vfFormatter.preCalculateMinTotalWidth(vfVoices) + this.config.measureSpacingBuffer;
  }
}
```

The `vf` prefix is used to distinguish `vexflow` objects from `rendering` objects. This isn't strictly necessary, but it's preferred where ambiguity could detract from maintainability.

### Seed

[Seed](./seed.ts) does the heavy lifting of determining what measures can fit in a given system.

1. Instantiate all the `Measure` objects and record their widths. These are the width-adjustable objects in `vexml`.
2. Determine what measures can fit in a single `System`.
3. When there is no more width in a given `System`, start a new `System` and stretch out the widths of the measures of the previous system.

This process is repeated until all the `Measure` objects are accounted for.

### Spanners

Spanners are special structures that can span across _anything_ in the rendering hierachy. For example, a crescendo can span multiple notes, measures, or even systems.

In order to keep the implementation relatively simple, spanners introduce mutations into the rendering pipeline. The [Spanners](./spanners.ts) class isolates those mutations. Future spanners should adhere to this pattern.

In general, invalid spanners are either partially rendered or ignored (depending on the minimum of what's needed to render).

### Measure Fragments and Formatting

`vexflow` requires that all the staves and voices of a measure are created before formatting them. This is because an accidental of a note in one stave may influence the positioning of notes in other staves. Accidentals are only one of many examples.

`vexml` employs measure fragmentation to work around the limit of one `X` per `vexflow.Stave`, where `X` is any `vexflow` object that has a 1:1 relationship with `vexflow.Stave`. An example of this is how there can only be 1 `vexflow.StaveTempo` per `vexflow.Stave` ([code](https://github.com/0xfe/vexflow/blob/7e7eb97bf1580a31171302b3bd8165f057b692ba/src/stave.ts#L325)). Measure fragments are essentially invisible to the music sheet reader because they end up blending with the other fragments and look like a single continuous stave.

When `vexml` formats, it first finds measure fragment "events" in all parts. It coalesces these events using divisions (aka the beats of the notes), and creates fragments using the algorithm discussed in https://github.com/stringsync/vexml/pull/183#issuecomment-1870242110. When it formats, it does it for each fragment.

There may be some odd spacing in exceptional cases. If you do come across this, validate if there are multiple fragments being rendered for a given measure. If not, consider making a small reproducible case in `vexflow` and file a bug.

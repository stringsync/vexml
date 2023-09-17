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
2. **create**: A rendering hierarchy is created from the parsed document.
3. **render**: `vexflow` elements are created from the rendering hierarchy.

**create** is a necessary lifecycle stage because you can't render certain things without looking at the _entire_ MusicXML document.

Think of this stage as a preparation process where you want to know as much as you can about the `musicxml` structure _before_ turning it into `vexflow` elements. When developing in this stage, you should be continously asking the question "What will I need for `vexflow`?", but you won't commit to it yet. You typically don't specify formatting parameters, such as `x`, `y`, or `width` during **create** time.

### Rendering Hierarchy

The rendering hierarchy is a unique data structure that is a _mixture_ of:

- MusicXML
- `vexflow`
- Music Theory

Each of these sub-hierarchies do not overlap 1:1, which makes it extremely difficult to reason how the structures map to each other. The complexity is amplified by how they use similar names to represent different things.

For example, take the term "System". [`vexflow.System`](https://github.com/0xfe/vexflow/blob/master/src/system.ts) seems to actually be concerned with how a measure is drawn _for a specific part_. `vexml` takes an approach to [opensheetmusicdisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Music-Sheet-Object-Model) where the system is composed of _all of the measures_ for _all of the parts_ on a horizontal plane. The latter approach seems to align with how MusicXML views [systems](https://www.w3.org/2021/06/musicxml40/musicxml-reference/examples/system-distance-element/).

The rendering hierarachy is also intended to break down the rendering logic in reasonably maintainable chunks. If any component becomes difficult to maintain or is error-prone. Consider decomposing it into smaller chunks.

While developing this library, avoid relationships between distant ancestors and descendants. However, sometimes this is necessary. For example, a relationship in `rendering` is:

- A `System` has many `Parts`.
- A `Part` belongs to a `System`.
- A `Part` has many `Measures`.
- A `Measure`belongs to a `Part`.
- A `System` has many `Measures` through `Parts`.

[System.split](./system.ts)'s purpose is to take a single system and break it down to smaller ones to accommodate a specific width. In order to do this, it must figure out the width of each measure accounting for each part. Therefore, a `System` ends up querying the `Measure` which breaks encapsulation, but it is necessary for the computation.

### Immutability

While not a strict requirement, prefer making the state accumulated from the **create** stage private and immutable. Anything that is dynamic can likely be passed down during the **render** stage. This allows the code to be easier to reason about.

### Testing

**DO** add integration tests in [tests/integration](../../tests/integration) to test the `rendering` library. Rely on image snapshot testing to prevent regressions.

**DO NOT** write unit tests for the `rendering` library. Unit testing these kind of tests seems expensive and error prone.

### Object Namespaces

You may notice how some **create** and **render** types use namespaces.

The `musicXml` key serves as a namespace:

```ts
class Stave {
  /** Creates a Measure. */
  static create(opts: {
    config: Config;
    musicXml: {
      measure: musicxml.Measure;
    };
    systemId: symbol;
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
  staffNumber: number;
  width: number;
  vexflow: {
    stave: vexflow.Stave;
  };
  voices: VoiceRendering[];
};
```

This is intentionally done because a lot of objects from different libraries use the same name. The namespace makes the calling code easier to understand.

Another example is with variable names:

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

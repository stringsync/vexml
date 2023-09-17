# musicxml

The `musicxml` library is responsible for interfacing with [MusicXML](https://www.w3.org/2021/06/musicxml40/) documents.

## Intent

### Goals

- **DO** provide an interface for getting data from a MusicXML document.
- **DO** artifically flatten the XML structure of a MusicXML document.
- **DO** conform data from the MusicXML document to reasonable defaults when needed.

### Non-goals

- **DO NOT** map 1:1 TypeScript classes to MusicXML elements.
- **DO NOT** mutate data in a MusicXML document.
- **DO NOT** transform the data to an intermediate data structure for `vexflow`.

## Design

### MusicXML Element Wrappers

Most classes in this library wrap a [MusicXML element](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/). They will just take a `NamedElement` node and provide convenience methods to the underlying data. For example, for the [<barline> element](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/barline/):

```ts
export class Barline {
  constructor(private element: NamedElement<'barline'>) {}

  /** Returns the bar style of the barline. Defaults to 'regular'. */
  getBarStyle(): BarStyle {
    return this.element.first('bar-style')?.content().enum(BAR_STYLES) ?? 'regular';
  }

  // other attribute and content-getters.
}
```

Notice how `<bar-style>` is actually a child element of `<barline>`. Instead of creating a `BarStyle` class, we traverse the tree from the `<barline>` node and extract the data we care about. This effectively "flattens" the tree and makes it easier for callers to access the data.

Another thing worth calling out is how this class provides a static default. In a future version of `vexml`, we may consider making this configurable. Prefer to set a reasonable default instead of throwing an error.

### Testing

Each class in this library has a unit test in [tests/unit](../../tests/unit). 100% coverage is preferred (but not strictly required), because the tests are relatively easy to setup. The most tedious work is adding the MusicXML spec to [src/util/xml.ts](../util/xml.ts), but there is plenty of prior art to work from.

### Enums

Instead of using native TypeScript enums, use the `Enum` class defined in [src/util/enum.ts](../util/enum.ts). This avoids the need to do a translation from a plain string (originating from the MusicXML document) to a TypeScript enum. `Enum` also plays nicely with the `Value` class defined in [src/util/value.ts](../util/value.ts).

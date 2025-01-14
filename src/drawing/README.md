# drawing

## Intent

### Goals

- **DO** extend `vexflow` drawing capabilities.
- **DO** provide a low level interface for graphics primitives.
- **DO** serve as a facade for some `vexflow` APIs.

### Non-goals

- **DO NOT** patch `vexflow` APIs.
- **DO NOT** create `vexflow` objects (use [rendering](../rendering/README.md) instead).
- **DO NOT** make MusicXML transformations.

## Design

`vexflow` provides a [RenderContext](https://github.com/0xfe/vexflow/blob/7e7eb97bf1580a31171302b3bd8165f057b692ba/src/rendercontext.ts) that decouples the drawer from the rendering backend (SVG or canvas). This context has methods to draw lines and shapes. [Element](https://github.com/0xfe/vexflow/blob/7e7eb97bf1580a31171302b3bd8165f057b692ba/src/element.ts) implementers typically leverage this context to draw whatever they're supposed to represent.

The `drawing` library is similar to `Element`: leverage the `RenderContext` to draw whatever is represented by the class.

### Interface

For now, class implementations in `drawing` are not enforced by an interface. This was done because at the time of writing, there was only one drawable: `Text`. If the library evolves to have several drawing, it may be appropriate to enforce a certain shape in TypeScript, to possibly make it easier for the caller to manage.

For now, the "soft" interface looks like this:

```ts
class Foo {
  draw(vfContext: vexflow.RenderContext): void {
    // implementation here
  }
}
```

This method should be purely side effects. I strongly discourage returning anything from `draw()`, since it may cause an unwanted dependency.

### Testing

Similar to the `rendering` library, prefer to cover these in snapshot integration tests.

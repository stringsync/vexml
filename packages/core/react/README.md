# core/react

Wiring React to the rest of core, and nothing else. Anything that would
work without React lives in `core/browser`, and this
subpath stays small on purpose.

## Owning a resource for a mount

```ts
import { useResource, useDisposerEffect } from "core/react";

const parser = useResource(() => new Parser(source), [source]);

useDisposerEffect((disposer) => {
	disposer.use(new WindowBackgroundObserver());
}, []);
```

`useResource` builds a `Resource` during render and disposes it on unmount,
or when one of its deps changes, compared the way `useMemo` compares them. List
every value the factory reads, and an inline arrow keeps its instance across
renders. The factory must be render-pure: React can abandon a render before
commit, and anything acquired there would never be disposed.
Acquire timers, subscriptions and workers in `useDisposerEffect` instead, which
runs after commit and disposes everything it registered on teardown.

## Rendering something that raises events

```ts
import { useReactive } from "core/react";

const title = useReactive(player, (player) => player.title(), ["change"]);
```

`useReactive` reads a projection of an `Eventful` and re-renders when the named
events change what it returns. The projection is compared shallowly, so an
event that changes nothing the component reads does not re-render it.

`useExternalStore` and `ReactiveExternalStore` are the layer underneath, for
when a store is wanted directly.

The hook subscribes once per source and re-subscribes when the source changes
identity, so it pairs with `useResource`, which hands back a fresh instance
after StrictMode retires one or its deps change:

```ts
const feed = useResource(() => new FeedController(source), [source]);
const scores = useReactive(feed, (feed) => feed.scores(), ["changed"]);
```

Pass a stable source all the same: a controller or a singleton, not an object
built during render, which would re-subscribe every render.

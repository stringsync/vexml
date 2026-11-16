# core/browser

The browser platform behind interfaces, so what a page does about scrolling,
visibility, gestures and frames is not scattered through the UI code that
happens to need it. Nothing here is tied to a UI library.

## Device

```ts
import { Device } from "core/browser";

const device = Device.parse(navigator.userAgent, {
	touchPoints: navigator.maxTouchPoints,
});
device.isIos(); // true on an iPhone, and on an iPad claiming to be a Mac
device.type; // "phone" | "tablet" | "desktop"
device.browser; // "safari" | "chrome" | "firefox" | "edge" | "unknown"
```

It takes the string rather than reading `navigator`, so the same call works on
the server against a request header. It answers os, browser, type and touch,
and nothing else: versions, device models and bot detection need a maintained
database of user agents, which this is not.

The phone and tablet rules come from
[isMobile](https://github.com/kaimallea/isMobile), which covers the cases a
first attempt gets wrong: an Android tablet is the one that does *not* say
"Mobile", and the Facebook and Twitter in-app browsers append a device that is
not the one in your hand. `touchPoints` is ours, and is what tells an iPad from
the Mac it reports itself as.

## Scroll

```ts
import { Scroll } from "core/browser";

collapse.open();
Scroll.reveal(() => panel, { bottomInset: footerHeight });
```

Waits for layout, leaves the page alone when the target is already visible, and
honours `prefers-reduced-motion`. A burst of calls settles on one scroll rather
than fighting over the page.

"Visible" means visible, not merely inside the viewport: a scrollable ancestor
clips its children, so a target past that fold counts as off screen even when
the viewport says otherwise.

## Frames

```ts
import { AnimationLoop, raf } from "core/browser";

const loop = new AnimationLoop(clock);
loop.events.on("frame", ({ dt }) => cursor.advance(dt));
loop.start();
```

`raf` is one frame: await it, or dispose it to give it up. `AnimationLoop`
keeps asking for the next one. For work that a stream of events triggers,
`RafTaskQueue` in `core/task/browser` paces it to one run per frame.

## Observers

```ts
import {
	WindowBackgroundObserver,
	WindowUserActivationObserver,
} from "core/browser";

const background = new WindowBackgroundObserver();
background.events.on("change", () => {
	background.isBackgrounded() ? poll.stop() : poll.start();
});

const activation = new WindowUserActivationObserver(timer);
await activation.wait(); // the gesture browsers demand before audio starts
```

A page counts as backgrounded when it is not visible or does not have focus.
Visibility alone misses a switch between desktop windows, and focus alone misses
a mobile app switch that fires `visibilitychange` without a blur.

Transient user activation expires on a timer of the browser's choosing with no
event to say so, so the observer polls while it holds and stops once it lapses.

## Downloads

```ts
import { download } from "core/browser";

const url = URL.createObjectURL(blob);
download(url, "export.csv");
URL.revokeObjectURL(url);
```

## Class names

```ts
import { cx } from "core/browser";

cx("btn", isPrimary && "btn-primary", { "btn-lg": size === "lg" });
```

Strings, numbers, nested arrays and objects with truthy keys. Everything falsy
is dropped, so a `count && "badge"` guard contributes nothing rather than the
class name `0`.

## Testing

`core/browser/dom` puts happy-dom on `globalThis`, for tests of anything
that needs a document. Import it for its side effect.

```ts
import "core/browser/dom";
```

It hands back the runtime's `fetch`, `Request` and `Response` afterwards:
happy-dom's are not the ones `Bun.serve` recognises, and every test file sharing
the process would otherwise lose its HTTP.

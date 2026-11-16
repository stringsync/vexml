# core/geometry

The 2D value types a web app keeps rewriting, `Rect` (an axis-aligned
rectangle) and `Position` (a point), plus a `QuadTree` to look them up by where
they are.

```ts
import { Position, Rect } from "core/geometry";

const card = Rect.fromDomRect(el.getBoundingClientRect());

card.contains(Position.fromEvent(event)); // was the click on the card?
card.intersects(other); // do they overlap?
card.intersection(other); // by how much, or null
```

Both are values: every operation returns a new one, so a rect handed to a
collision index or a layout cache cannot move under it.

```ts
const rect = new Rect(1, 2, 3, 4);
rect.translate(10, 10); // a new rect; `rect` is still at (1, 2)
```

y grows downward, the convention every browser API uses, so `top` is the
smaller y and `bottom` the larger.

Two rects that merely share an edge do not intersect. An overlap of zero is not
an overlap, and counting it as one means nudging things apart by 0px forever.

## QuadTree

```ts
import { QuadTree, Rect } from "core/geometry";

const tree = new QuadTree<Note>(new Rect(0, 0, 1000, 1000));
for (const note of notes) {
	tree.insert(note, note.bounds);
}
tree.query(viewport); // only the notes that could be on screen
```

An index of rectangles by where they are, so "what is under the cursor" and
"what overlaps this" do not have to touch every item. `query` is a first pass,
not an answer: it returns everything whose bounds overlap the area, which for
anything that is not a rectangle is more than actually hits. Test the survivors
properly.

There is no `remove`. Rebuilding costs about what a scattering of removals
does, and a tree that is never edited cannot go stale behind an item that
moved.

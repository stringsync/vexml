/*
 * Where a loupe goes around the thing being dragged, in client px (its top-left). A right thumb
 * dragging it covers everything below and right of the touch, so the loupe floats `gap` above the
 * anchor, centered on the magnified point. Where the viewport's top edge leaves no room, it sits
 * right of the anchor, where left-to-right reading goes next, else left of it; with no room either
 * side (a narrow phone), against the viewport's right edge. Always kept within the viewport, the
 * part of the page on screen, which a pinch zoom offsets from the client origin.
 */
export function placeLoupe(
	size: { width: number; height: number; gap: number },
	anchor: { left: number; top: number; right: number },
	at: { x: number; y: number },
	viewport: { left: number; top: number; width: number; height: number },
): { left: number; top: number } {
	const { width, height, gap } = size;
	const right = viewport.left + viewport.width;
	const bottom = viewport.top + viewport.height;
	// Keep an edge within the viewport; a loupe larger than it pins to its start.
	const x = (value: number) =>
		Math.max(viewport.left, Math.min(value, right - width));
	const y = (value: number) =>
		Math.max(viewport.top, Math.min(value, bottom - height));
	const above = anchor.top - gap - height;
	if (above >= viewport.top) {
		return { left: x(at.x - width / 2), top: y(above) };
	}
	const top = y(at.y - height / 2);
	const rightOf = anchor.right + gap;
	if (rightOf + width <= right) {
		return { left: rightOf, top };
	}
	const leftOf = anchor.left - gap - width;
	if (leftOf >= viewport.left) {
		return { left: leftOf, top };
	}
	return { left: x(right - width), top };
}

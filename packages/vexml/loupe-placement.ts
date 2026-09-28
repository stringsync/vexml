/*
 * Where a loupe goes around the thing being dragged, in client px (its top-left). A right thumb
 * dragging it covers everything below and right of the touch, so the loupe floats `gap` above the
 * anchor, centered on the magnified point. Where the viewport's top edge leaves no room, it sits
 * right of the anchor, where left-to-right reading goes next, else left of it; with no room either
 * side (a narrow phone), against the viewport's right edge. Always kept within the viewport.
 */
export function placeLoupe(
	size: { width: number; height: number; gap: number },
	anchor: { left: number; top: number; right: number },
	at: { x: number; y: number },
	viewport: { width: number; height: number },
): { left: number; top: number } {
	const { width, height, gap } = size;
	const above = anchor.top - gap - height;
	if (above >= 0) {
		return {
			left: clamp(at.x - width / 2, viewport.width - width),
			top: clamp(above, viewport.height - height),
		};
	}
	const top = clamp(at.y - height / 2, viewport.height - height);
	const rightOf = anchor.right + gap;
	if (rightOf + width <= viewport.width) {
		return { left: rightOf, top };
	}
	const leftOf = anchor.left - gap - width;
	if (leftOf >= 0) {
		return { left: leftOf, top };
	}
	return { left: Math.max(0, viewport.width - width), top };
}

// Keep an edge within [0, max]; a loupe larger than the viewport pins to its start.
function clamp(value: number, max: number): number {
	return Math.max(0, Math.min(value, max));
}

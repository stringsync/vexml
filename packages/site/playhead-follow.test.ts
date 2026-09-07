import { expect, it } from 'bun:test';
import { PlayheadFollow } from './playhead-follow';

it.each([
	{ playing: false, moved: false, visible: false, calls: 0 },
	{ playing: true, moved: false, visible: false, calls: 1 },
	{ playing: false, moved: true, visible: false, calls: 1 },
	{ playing: true, moved: true, visible: true, calls: 0 },
	{ playing: false, moved: true, visible: true, calls: 0 },
])('follows with playing=$playing, selectionMoved=$moved, visible=$visible', ({
	playing,
	moved,
	visible,
	calls,
}) => {
	const scrolls: { behavior: 'smooth' }[] = [];
	const follower = new PlayheadFollow({
		isFullyVisible: () => visible,
		scrollIntoView: (opts) => {
			scrolls.push(opts);
		},
	});
	follower.update(playing, moved);
	expect(scrolls).toHaveLength(calls);
});

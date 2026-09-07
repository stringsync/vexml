import { beforeEach, describe, expect, it } from 'bun:test';
import { PlayheadFollow } from './playhead-follow';

describe('PlayheadFollow', () => {
	let scrolls: { behavior: 'smooth' }[];
	let visible: boolean;
	let follower: PlayheadFollow;

	beforeEach(() => {
		scrolls = [];
		visible = false;
		follower = new PlayheadFollow({
			isFullyVisible: () => visible,
			scrollIntoView: (opts) => {
				scrolls.push(opts);
			},
		});
	});

	it('does not scroll when paused with no selection move', () => {
		follower.update(false, false);
		expect(scrolls).toHaveLength(0);
	});

	it('scrolls when playing and not visible', () => {
		follower.update(true, false);
		expect(scrolls).toHaveLength(1);
	});

	it('scrolls when the selection moves and not visible', () => {
		follower.update(false, true);
		expect(scrolls).toHaveLength(1);
	});

	it('does not scroll when playing and already visible', () => {
		visible = true;
		follower.update(true, true);
		expect(scrolls).toHaveLength(0);
	});

	it('does not scroll when the selection moves and already visible', () => {
		visible = true;
		follower.update(false, true);
		expect(scrolls).toHaveLength(0);
	});
});

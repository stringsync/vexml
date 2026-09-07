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

	it('does not scroll when paused', () => {
		follower.update(false);
		expect(scrolls).toHaveLength(0);
	});

	it('scrolls when playing and not visible', () => {
		follower.update(true);
		expect(scrolls).toHaveLength(1);
	});

	it('does not scroll when playing and already visible', () => {
		visible = true;
		follower.update(true);
		expect(scrolls).toHaveLength(0);
	});
});

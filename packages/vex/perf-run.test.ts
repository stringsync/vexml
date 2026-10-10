import { describe, expect, it } from 'bun:test';
import { Duration } from 'webappwiz/time';
import { FakeClock } from 'webappwiz/time/testing';
import type { PerfEvent } from './perf-events';
import { PerfRun } from './perf-run';

const PNG = Buffer.from('not really a png');

function recorded(run: PerfRun): PerfEvent[] {
	const events: PerfEvent[] = [];
	run.subscribe((event) => events.push(event));
	return events;
}

describe('PerfRun', () => {
	it('stamps each event with the time since the run started', () => {
		const clock = new FakeClock(Duration.secs(100));
		const run = new PerfRun(clock);
		const events = recorded(run);

		run.start(['a']);
		clock.advance(Duration.ms(40));
		run.render('a', 'vexml', { ms: 40, size: '1x1' }, PNG);
		clock.advance(Duration.ms(10));
		run.done();

		expect(events.map((event) => event.at)).toEqual([0, 40, 50]);
	});

	it('replays the run so far to a late subscriber, then keeps it current', () => {
		const run = new PerfRun(new FakeClock());
		run.start(['a']);
		run.render('a', 'vexml', { ms: 1, size: '1x1' }, PNG);

		const events = recorded(run);
		run.done();

		expect(events.map((event) => event.type)).toEqual([
			'start',
			'render',
			'done',
		]);
	});

	it('stops telling a subscriber once it unsubscribes', () => {
		const run = new PerfRun(new FakeClock());
		const events: PerfEvent[] = [];
		const unsubscribe = run.subscribe((event) => events.push(event));

		unsubscribe();
		run.start(['a']);

		expect(events).toEqual([]);
	});

	it('keeps the image of each render that worked', () => {
		const run = new PerfRun(new FakeClock());
		run.render('a', 'osmd', { ms: 1, size: '1x1' }, PNG);
		run.render('a', 'alphatab', { error: 'boom' });

		expect(run.image('a', 'osmd')).toBe(PNG);
		expect(run.image('a', 'alphatab')).toBeUndefined();
	});
});

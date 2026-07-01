import { describe, expect, it } from 'bun:test';
import { EventTarget } from './event-target';

// A tiny event map for exercising the generic target in isolation.
interface TestMap {
	ping: { n: number };
	pong: string;
}

describe(EventTarget, () => {
	it('emit delivers to every listener for the type, not others', () => {
		const target = new EventTarget<TestMap>();
		const pings: number[] = [];
		const pongs: string[] = [];
		target.addEventListener('ping', (e) => pings.push(e.n));
		target.addEventListener('ping', (e) => pings.push(e.n * 10));
		target.addEventListener('pong', (e) => pongs.push(e));

		target.dispatchEvent('ping', { n: 2 });
		expect(pings).toEqual([2, 20]);
		expect(pongs).toEqual([]);
	});

	it('count reflects registrations and dedups the same listener', () => {
		const target = new EventTarget<TestMap>();
		const listener = (_e: { n: number }) => {};
		expect(target.count('ping')).toBe(0);
		target.addEventListener('ping', listener);
		target.addEventListener('ping', listener); // same ref -> still one
		expect(target.count('ping')).toBe(1);
		target.addEventListener('ping', (_e) => {});
		expect(target.count('ping')).toBe(2);
	});

	it('removeEventListener stops delivery and decrements count', () => {
		const target = new EventTarget<TestMap>();
		const seen: number[] = [];
		const listener = (e: { n: number }) => seen.push(e.n);
		target.addEventListener('ping', listener);
		target.dispatchEvent('ping', { n: 1 });
		target.removeEventListener('ping', listener);
		target.dispatchEvent('ping', { n: 2 });
		expect(seen).toEqual([1]);
		expect(target.count('ping')).toBe(0);
	});

	it('emit with no listeners is a no-op', () => {
		const target = new EventTarget<TestMap>();
		expect(() => target.dispatchEvent('pong', 'x')).not.toThrow();
	});

	it('a listener unsubscribing mid-dispatch does not perturb the current fan-out', () => {
		const target = new EventTarget<TestMap>();
		const seen: string[] = [];
		const a = (_e: { n: number }) => {
			seen.push('a');
			target.removeEventListener('ping', b); // remove a not-yet-called listener mid-dispatch
		};
		const b = (_e: { n: number }) => seen.push('b');
		target.addEventListener('ping', a);
		target.addEventListener('ping', b);
		target.dispatchEvent('ping', { n: 0 });
		// b was still called this round (iteration is over a snapshot), but is gone next round.
		expect(seen).toEqual(['a', 'b']);
		target.dispatchEvent('ping', { n: 0 });
		expect(seen).toEqual(['a', 'b', 'a']);
	});
});

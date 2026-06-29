import { expect, test } from 'bun:test';
import { EventBus } from './events';

// A tiny event map for exercising the generic bus in isolation.
interface TestMap {
	ping: { n: number };
	pong: string;
}

test('emit delivers to every listener for the type, not others', () => {
	const bus = new EventBus<TestMap>();
	const pings: number[] = [];
	const pongs: string[] = [];
	bus.addEventListener('ping', (e) => pings.push(e.n));
	bus.addEventListener('ping', (e) => pings.push(e.n * 10));
	bus.addEventListener('pong', (e) => pongs.push(e));

	bus.emit('ping', { n: 2 });
	expect(pings).toEqual([2, 20]);
	expect(pongs).toEqual([]);
});

test('count reflects registrations and dedups the same listener', () => {
	const bus = new EventBus<TestMap>();
	const listener = (_e: { n: number }) => {};
	expect(bus.count('ping')).toBe(0);
	bus.addEventListener('ping', listener);
	bus.addEventListener('ping', listener); // same ref -> still one
	expect(bus.count('ping')).toBe(1);
	bus.addEventListener('ping', (_e) => {});
	expect(bus.count('ping')).toBe(2);
});

test('removeEventListener stops delivery and decrements count', () => {
	const bus = new EventBus<TestMap>();
	const seen: number[] = [];
	const listener = (e: { n: number }) => seen.push(e.n);
	bus.addEventListener('ping', listener);
	bus.emit('ping', { n: 1 });
	bus.removeEventListener('ping', listener);
	bus.emit('ping', { n: 2 });
	expect(seen).toEqual([1]);
	expect(bus.count('ping')).toBe(0);
});

test('emit with no listeners is a no-op', () => {
	const bus = new EventBus<TestMap>();
	expect(() => bus.emit('pong', 'x')).not.toThrow();
});

test('a listener unsubscribing mid-dispatch does not perturb the current fan-out', () => {
	const bus = new EventBus<TestMap>();
	const seen: string[] = [];
	const a = (_e: { n: number }) => {
		seen.push('a');
		bus.removeEventListener('ping', b); // remove a not-yet-called listener mid-dispatch
	};
	const b = (_e: { n: number }) => seen.push('b');
	bus.addEventListener('ping', a);
	bus.addEventListener('ping', b);
	bus.emit('ping', { n: 0 });
	// b was still called this round (iteration is over a snapshot), but is gone next round.
	expect(seen).toEqual(['a', 'b']);
	bus.emit('ping', { n: 0 });
	expect(seen).toEqual(['a', 'b', 'a']);
});

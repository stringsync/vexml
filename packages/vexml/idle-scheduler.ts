import type { Resource } from 'core/disposable';

/* How long a slice of idle work may go on: the browser's IdleDeadline, or a fake's budget. */
export interface IdleSlice {
	timeRemaining(): number;
}

/* Runs work when the main thread has nothing better to do, a slice at a time. One request is
 * one slice: the work asks for the next itself, so a stream of slices stops the moment nobody
 * asks for more. Disposing the request cancels a slice that has not run. BrowserIdleScheduler
 * is the production implementer, on requestIdleCallback; a test drives FakeIdleScheduler. */
export interface IdleScheduler {
	request(slice: (budget: IdleSlice) => void): Resource;
}

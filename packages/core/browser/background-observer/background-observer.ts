import type { Events } from "core/events";

export type BackgroundObserverEventMap = {
	/** The page went to the background or came back. */
	change: undefined;
};

/**
 * Whether the user is looking at the page, so work nobody can see (polling, an
 * animation, an audio meter) can stand down while they are elsewhere.
 */
export interface BackgroundObserver {
	readonly events: Events<BackgroundObserverEventMap>;
	isBackgrounded(): boolean;
}

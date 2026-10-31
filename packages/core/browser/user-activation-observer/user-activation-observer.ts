import type { Events } from "core/events";

export type UserActivationObserverEventMap = {
	/** The user became active, or their activation lapsed. */
	change: undefined;
};

/**
 * Whether the user has interacted with the page, which is what browsers demand
 * before they will start audio, go fullscreen or open a window.
 *
 * `isActive` is the transient activation that expires seconds after a gesture;
 * `hasBeenActive` is sticky and stays true for the rest of the page's life.
 */
export interface UserActivationObserver {
	readonly events: Events<UserActivationObserverEventMap>;
	isActive(): boolean;
	hasBeenActive(): boolean;
	/** Resolves as soon as the user has interacted, immediately if they already have. */
	wait(): Promise<void>;
}

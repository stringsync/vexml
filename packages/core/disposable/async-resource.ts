/** Something holding a resource whose release has to be awaited. */
export interface AsyncResource {
	disposeAsync(): Promise<void>;
}

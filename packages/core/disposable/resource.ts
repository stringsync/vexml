/** Something holding a resource that must be released. */
export interface Resource {
	dispose(): void;
}

/**
 * Glob is the path-matching seam. Typically, this is assigned the variable
 * name `glob`.
 *
 * The pattern comes per call rather than per instance, so a caller holding a
 * rule and a path never has to keep a compiled matcher alongside it. An
 * implementation that does compile patterns caches them itself.
 */
export interface Glob {
	matches(pattern: string, path: string): boolean;
}

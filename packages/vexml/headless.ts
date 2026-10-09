/* `@stringsync/vexml/headless`: snapshots made with no DOM, for a server to draw ahead of time.
 * Kept out of the main entry, since it reads font files from disk. */
export {
	createSnapshot,
	type SnapshotCanvas,
	type SnapshotOptions,
} from './create-snapshot';
export type { FontRegistry, HeadlessFont } from './headless-fonts';
export {
	type ScoreSnapshot,
	SNAPSHOT_VERSION,
} from './score-snapshot';

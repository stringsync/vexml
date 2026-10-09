/** Why a snapshot can't be rendered: it isn't one, it is from another snapshot version, or it
 * was engraved with a different config. */
export type SnapshotMismatchReason = 'format' | 'version' | 'config';

/**
 * Thrown by `render` for a ScoreSnapshot it can't show as recorded, before it touches the
 * container: render the MusicXML instead (and snapshot that score to replace the stale one).
 */
export class SnapshotMismatchError extends Error {
	override readonly name = 'SnapshotMismatchError';

	constructor(
		readonly reason: SnapshotMismatchReason,
		message: string,
	) {
		super(message);
	}
}

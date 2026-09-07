import type {
	CursorController,
	EditingBindings,
	EditingCommand,
	EditingKey,
	EditingSession,
	Sequence,
} from '@stringsync/vexml';

/** Playground policy: vertical arrows traverse chords and voices; Shift-horizontal jumps measures.
 * With no selection, start near playback in the remembered voice. */
export class SiteEditingBindings implements EditingBindings {
	constructor(
		private readonly editor: EditingSession,
		private readonly sequence: Sequence,
		private readonly cursor: CursorController,
	) {}
	resolve(key: EditingKey): EditingCommand | null {
		if (key.altKey || key.ctrlKey || key.metaKey) {
			return null;
		}
		if (key.key === 'Escape') {
			return { type: 'clear' };
		}
		if (
			!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key.key)
		) {
			return null;
		}
		if (key.shiftKey && (key.key === 'ArrowUp' || key.key === 'ArrowDown')) {
			return null;
		}
		if (!this.editor.getFocus()) {
			const target = this.sequence.getNoteNearMs(this.cursor.getTimeMs(), {
				voice: this.editor.getActiveVoice(),
			});
			const note = target?.note.getSources()[0];
			if (note) {
				if (key.key === 'ArrowDown') {
					return { type: 'select', note, chordEdge: 'top' };
				}
				if (key.key === 'ArrowUp') {
					return { type: 'select', note, chordEdge: 'bottom' };
				}
				return { type: 'select', note };
			}
		}
		const horizontal = key.key === 'ArrowLeft' || key.key === 'ArrowRight';
		const horizontalUnit = key.shiftKey ? 'measure' : 'note';
		return {
			type: 'move',
			move: {
				unit: horizontal ? horizontalUnit : 'vertical',
				direction: key.key === 'ArrowRight' || key.key === 'ArrowDown' ? 1 : -1,
			},
		};
	}
}

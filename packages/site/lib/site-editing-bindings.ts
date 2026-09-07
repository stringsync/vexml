import type {
	EditingBindings,
	EditingCommand,
	EditingKey,
} from '@stringsync/vexml';

/** Playground policy: vertical arrows traverse chords and voices; Shift-horizontal jumps measures.
 * With no selection, navigation begins at the document boundary. */
export class SiteEditingBindings implements EditingBindings {
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

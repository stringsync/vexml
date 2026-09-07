import type {
	EditingBindings,
	EditingCommand,
	EditingKey,
} from './editing-bindings';

/** Arrows follow notes/chord members and voices. */
export class DefaultEditingBindings implements EditingBindings {
	resolve(key: EditingKey): EditingCommand | null {
		if (
			!key.altKey &&
			(key.ctrlKey || key.metaKey) &&
			key.key.toLowerCase() === 'z'
		) {
			return { type: key.shiftKey ? 'redo' : 'undo' };
		}
		if (key.altKey || key.ctrlKey || key.metaKey) {
			return null;
		}
		if (key.key === 'Escape') {
			return { type: 'clear' };
		}
		switch (key.key) {
			case 'ArrowLeft':
				return {
					type: 'move',
					extend: key.shiftKey,
					move: { unit: 'note', direction: -1 },
				};
			case 'ArrowRight':
				return {
					type: 'move',
					extend: key.shiftKey,
					move: { unit: 'note', direction: 1 },
				};
			case 'ArrowUp':
				return {
					type: 'move',
					extend: key.shiftKey,
					move: { unit: 'vertical', direction: -1 },
				};
			case 'ArrowDown':
				return {
					type: 'move',
					extend: key.shiftKey,
					move: { unit: 'vertical', direction: 1 },
				};
			default:
				return null;
		}
	}
}

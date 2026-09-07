import type {
	EditingBindings,
	EditingCommand,
	EditingKey,
} from './editing-bindings';

/** Arrows follow notes/chord members and voices; Shift extends within the anchored voice. */
export class DefaultEditingBindings implements EditingBindings {
	resolve(key: EditingKey): EditingCommand | null {
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
					move: { unit: 'note', direction: -1 },
					extend: key.shiftKey,
				};
			case 'ArrowRight':
				return {
					type: 'move',
					move: { unit: 'note', direction: 1 },
					extend: key.shiftKey,
				};
			case 'ArrowUp':
				return {
					type: 'move',
					move: { unit: 'vertical', direction: -1 },
					extend: key.shiftKey,
				};
			case 'ArrowDown':
				return {
					type: 'move',
					move: { unit: 'vertical', direction: 1 },
					extend: key.shiftKey,
				};
			default:
				return null;
		}
	}
}

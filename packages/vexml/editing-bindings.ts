import type { Note } from '@stringsync/mdom';
import type { EditingNavigation } from './editing-navigator';

export type EditingCommand =
	| { type: 'move'; move: EditingNavigation; extend?: boolean }
	| { type: 'select'; note: Note; chordEdge?: 'top' | 'bottom' }
	| { type: 'clear' }
	| { type: 'undo' | 'redo' };

/** A key snapshot also usable by framework event adapters. */
export interface EditingKey {
	readonly key: string;
	readonly shiftKey: boolean;
	readonly altKey: boolean;
	readonly ctrlKey: boolean;
	readonly metaKey: boolean;
}

export interface EditingBindings {
	resolve(key: EditingKey): EditingCommand | null;
}

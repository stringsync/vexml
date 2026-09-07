import { MDOMParser } from '@stringsync/mdom';
import { EditingSession, render, type Score } from '@stringsync/vexml';
import '@stringsync/vexml/css';
import { Disposer } from 'webappwiz/disposable';
import xml from '../editing.musicxml?raw';

const container = document.querySelector<HTMLDivElement>('#score');
const status = document.querySelector<HTMLParagraphElement>('#status');
const add = document.querySelector<HTMLButtonElement>('#staccato');
const undo = document.querySelector<HTMLButtonElement>('#undo');
const redo = document.querySelector<HTMLButtonElement>('#redo');
if (!container || !status || !add || !undo || !redo) {
	throw new Error('Missing example controls');
}
const disposer = new Disposer();
const music = new MDOMParser().parseFromString(xml);
disposer.use(music.history);
const editor = disposer.use(new EditingSession(music));
let score: Score | null = null;
disposer.defer(() => score?.dispose());
let pending = Promise.resolve();
let generation = 0;

// Serialize renders and discard obsolete results; the editor outlives every Score.
const redraw = () => {
	const requested = ++generation;
	pending = pending
		.then(async () => {
			if (requested !== generation) {
				return;
			}
			const top = container.scrollTop;
			const left = container.scrollLeft;
			score?.dispose();
			score = null;
			const next = await render(editor.document, container);
			if (requested !== generation) {
				next.dispose();
				return;
			}
			score = next;
			score.createEditingController(editor);
			container.scrollTop = top;
			container.scrollLeft = left;
			status.textContent = '';
		})
		.catch((error) => {
			if (requested === generation) {
				status.textContent = String(error);
			}
		});
};
const refresh = () => {
	add.disabled = !editor.getSelection().length;
	undo.disabled = !editor.history.canUndo;
	redo.disabled = !editor.history.canRedo;
	undo.textContent = editor.history.undoLabel
		? `Undo ${editor.history.undoLabel}`
		: 'Undo';
	redo.textContent = editor.history.redoLabel
		? `Redo ${editor.history.redoLabel}`
		: 'Redo';
};
add.onclick = () => {
	editor.history.edit('Add staccato', () => {
		for (const note of editor.getSelection()) {
			if (!note.articulations.includes('staccato')) {
				note.addArticulation('staccato');
			}
		}
	});
};
disposer.defer(() => {
	add.onclick = null;
});
undo.onclick = () => {
	editor.undo();
};
disposer.defer(() => {
	undo.onclick = null;
});
redo.onclick = () => {
	editor.redo();
};
disposer.defer(() => {
	redo.onclick = null;
});
disposer.defer(editor.events.on('selectionchange', refresh));
disposer.defer(
	editor.events.on('documentchange', () => {
		refresh();
		redraw();
	}),
);
const pagehide = () => disposer.dispose();
window.addEventListener('pagehide', pagehide, { once: true });
disposer.defer(() => window.removeEventListener('pagehide', pagehide));
disposer.defer(() => generation++);
refresh();
redraw();

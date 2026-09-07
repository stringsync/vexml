import { MDOMParser } from '@stringsync/mdom';
import { EditingSession, render, type Score } from '@stringsync/vexml';
import '@stringsync/vexml/css';
import xml from '../editing.musicxml?raw';

const editor = new EditingSession(new MDOMParser().parseFromString(xml));
const container = document.querySelector<HTMLDivElement>('#score');
const status = document.querySelector<HTMLParagraphElement>('#status');
const add = document.querySelector<HTMLButtonElement>('#staccato');
const undo = document.querySelector<HTMLButtonElement>('#undo');
const redo = document.querySelector<HTMLButtonElement>('#redo');
if (!container || !status || !add || !undo || !redo) {
	throw new Error('Missing example controls');
}
let score: Score | null = null;
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
			status.textContent = String(error);
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
undo.onclick = () => {
	editor.undo();
};
redo.onclick = () => {
	editor.redo();
};
editor.events.on('selectionchange', refresh);
editor.events.on('documentchange', () => {
	refresh();
	redraw();
});
window.addEventListener(
	'pagehide',
	() => {
		generation++;
		score?.dispose();
		editor.dispose();
		editor.history.dispose();
	},
	{ once: true },
);
refresh();
redraw();

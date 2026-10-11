import { MDOMParser } from '@stringsync/mdom';
import { EditingSession, Note, render } from '@stringsync/vexml';

// The browser side of readme-media.ts: the library on globalThis for page.evaluate.
Object.assign(globalThis, {
	vexml: { render, EditingSession, MDOMParser, Note },
});

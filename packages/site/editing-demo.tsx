import {
	MDOMParser,
	Note as MNote,
	MusicXMLSerializer,
} from '@stringsync/mdom';
import {
	type EditingMove,
	EditingSession,
	Rect,
	render,
	type Score,
} from '@stringsync/vexml';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import chords from '../integration/__data__/chord.musicxml?raw';
import melody from '../integration/__data__/note.musicxml?raw';
import textFont from '../vexml/assets/fonts/SourceSans3-Regular.ttf?url';
import { Alert, AlertDescription } from './components/ui/alert';
import { Button } from './components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from './components/ui/card';
import { Textarea } from './components/ui/textarea';
import './index.css';

function EditingDemo() {
	const [source, setSource] = useState(melody);
	const [editor, setEditor] = useState(
		() => new EditingSession(new MDOMParser().parseFromString(melody)),
	);
	const [revision, setRevision] = useState(0);
	const [status, setStatus] = useState('Loading score…');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(true);
	const region = useRef<HTMLDivElement>(null);
	const current = useRef<Score | null>(null);

	const paint = useCallback((score: Score, session: EditingSession) => {
		for (const note of score.getElements().notes()) {
			note.color.off();
			note.halo.off();
		}
		for (const note of session.getSelectedElements(score.getElements())) {
			note.color.on('#155dfc');
			if (note.getSources()[0] === session.getFocus()) {
				note.halo.on('#e9a23b');
			}
		}
		const focus = session.getFocus();
		const pitch = focus?.pitch;
		setStatus(
			`${session.getSelection().length} selected${focus ? ` · Focus: ${pitch ? `${pitch.step}${pitch.alter ? ` (${pitch.alter > 0 ? '+' : ''}${pitch.alter})` : ''}${pitch.octave}` : 'rest'} · Measure ${focus.measure.number} · Voice ${focus.voice}` : ''}`,
		);
	}, []);

	// A render gets its own mount so cleanup of an older async render cannot remove a newer score.
	useEffect(() => {
		const parent = region.current;
		if (!parent) {
			return;
		}
		const mount = document.createElement('div');
		mount.dataset.revision = String(revision);
		parent.append(mount);
		let disposed = false;
		let score: Score | null = null;
		setBusy(true);
		void render(editor.document, mount, {
			fonts: { text: { family: 'EditingText', url: textFont } },
		})
			.then((result) => {
				if (disposed) {
					result.dispose();
					return;
				}
				score = result;
				current.current = result;
				const layer = result.addLayer('content');
				let start: { x: number; y: number } | null = null;
				let box: Rect | null = null;
				result.events.on('pointerdown', (event) => {
					if (event.native.button !== 0) {
						return;
					}
					parent.focus();
					event.native.preventDefault();
					(event.native.target as HTMLElement).setPointerCapture(
						event.native.pointerId,
					);
					start = event.point;
					box = null;
				});
				result.events.on('pointermove', (event) => {
					if (!start) {
						return;
					}
					const w = Math.abs(start.x - event.point.x);
					const h = Math.abs(start.y - event.point.y);
					if (w + h < 5) {
						return;
					}
					box = new Rect(
						Math.min(start.x, event.point.x),
						Math.min(start.y, event.point.y),
						w,
						h,
					);
					layer.ctx.clearRect(
						0,
						0,
						layer.ctx.canvas.width,
						layer.ctx.canvas.height,
					);
					layer.ctx.strokeStyle = '#155dfc';
					layer.ctx.lineWidth = 1;
					layer.ctx.strokeRect(box.x, box.y, box.w, box.h);
				});
				result.events.on('pointerup', (event) => {
					if (!start) {
						return;
					}
					start = null;
					layer.ctx.clearRect(
						0,
						0,
						layer.ctx.canvas.width,
						layer.ctx.canvas.height,
					);
					try {
						if (box) {
							editor.selectElements(result.getElements().within(box));
						} else {
							const note = event.target
								?.getSources()
								.find((node): node is MNote => node instanceof MNote);
							if (!note) {
								editor.selectNotes([]);
							} else if (event.native.metaKey || event.native.ctrlKey) {
								editor.toggle(note);
							} else {
								editor.select(note, { extend: event.native.shiftKey });
							}
						}
						setError('');
						paint(result, editor);
					} catch (error) {
						setError(String(error));
					}
					box = null;
				});
				paint(result, editor);
				setBusy(false);
			})
			.catch((error: unknown) => {
				if (!disposed) {
					setError(String(error));
					setBusy(false);
				}
			});
		return () => {
			disposed = true;
			if (current.current === score) {
				current.current = null;
			}
			score?.dispose();
			mount.remove();
		};
	}, [editor, revision, paint]);

	function move(direction: EditingMove, extend = false) {
		if (busy || !current.current) {
			return;
		}
		try {
			editor.move(direction, { extend });
			paint(current.current, editor);
			setError('');
		} catch (error) {
			setError(String(error));
		}
	}

	function edit(operation: () => boolean) {
		if (busy) {
			return;
		}
		try {
			if (operation()) {
				setSource(new MusicXMLSerializer().serializeToString(editor.document));
				setRevision((value) => value + 1);
				setBusy(true);
			}
			setError('');
		} catch (error) {
			setError(String(error));
		}
	}

	function load(xml: string) {
		try {
			setEditor(new EditingSession(new MDOMParser().parseFromString(xml)));
			setSource(xml);
			setError('');
		} catch (error) {
			setError(String(error));
		}
	}

	return (
		<main className="mx-auto flex max-w-6xl flex-col gap-5 p-6">
			<Card>
				<CardHeader>
					<CardTitle>MusicXML editing review</CardTitle>
					<CardDescription>
						Click a note, then use left/right to navigate. Up/down visits
						pitches within a chord. Blue marks selection; the amber halo marks
						focus.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<p>
						Shift-click or Shift-arrow extends a voice range. Command/Ctrl-click
						toggles notes. Drag across the score for a box selection.
					</p>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							onClick={() => load(melody)}
							disabled={busy}
						>
							Load melody
						</Button>
						<Button
							variant="outline"
							onClick={() => load(chords)}
							disabled={busy}
						>
							Load chords
						</Button>
						<Button
							variant="outline"
							onClick={() => move('previous')}
							disabled={busy}
						>
							Previous note
						</Button>
						<Button
							variant="outline"
							onClick={() => move('next')}
							disabled={busy}
						>
							Next note
						</Button>
						<Button
							variant="outline"
							onClick={() => edit(() => editor.undo())}
							disabled={busy}
						>
							Undo
						</Button>
						<Button
							variant="outline"
							onClick={() => edit(() => editor.redo())}
							disabled={busy}
						>
							Redo
						</Button>
						<Button
							onClick={() =>
								edit(() => editor.setPitch({ step: 'C', octave: 4 }))
							}
							disabled={busy}
						>
							Set selection to C4
						</Button>
						<Button
							onClick={() =>
								edit(() => editor.setPitch({ step: 'F', octave: 5 }))
							}
							disabled={busy}
						>
							Set selection to F5
						</Button>
					</div>
					<p role="status" aria-live="polite">
						{busy ? 'Rendering…' : status}
					</p>
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>
			<div
				ref={region}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the score application receives keyboard editing commands.
				tabIndex={0}
				role="application"
				aria-label="Editable score"
				className="touch-none overflow-auto rounded-lg border bg-background outline-offset-4"
				onKeyDown={(event) => {
					const moves: Record<string, EditingMove> = {
						ArrowLeft: 'previous',
						ArrowRight: 'next',
						ArrowUp: 'higher',
						ArrowDown: 'lower',
					};
					const direction = moves[event.key];
					if (direction) {
						event.preventDefault();
						move(direction, event.shiftKey);
					} else if (
						(event.metaKey || event.ctrlKey) &&
						event.key.toLowerCase() === 'z'
					) {
						event.preventDefault();
						edit(() => (event.shiftKey ? editor.redo() : editor.undo()));
					}
				}}
			/>
			<Card>
				<CardHeader>
					<CardTitle>MusicXML</CardTitle>
					<CardDescription>
						Pitch edits update this text. Paste your own uncompressed MusicXML
						and choose Load XML. Loading starts a new editing session.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Textarea
						aria-label="MusicXML source"
						value={source}
						onChange={(event) => setSource(event.target.value)}
						className="h-48"
					/>
					<Button
						variant="outline"
						onClick={() => load(source)}
						disabled={busy}
					>
						Load XML
					</Button>
					<p>
						This milestone changes ordinary pitched notes. Insertion, deletion,
						tied-pitch edits and guitar fingering changes are not implemented
						yet. Undo restores edits, but does not undo selection movement.
					</p>
				</CardContent>
			</Card>
		</main>
	);
}

const root = document.getElementById('root');
if (root) {
	createRoot(root).render(<EditingDemo />);
}

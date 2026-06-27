import { useCallback, useEffect, useRef, useState } from 'react';
import type { Config } from '../../src';
import { render } from '../../src';

// Vite reads the test fixtures straight from ../tests at build time (fs.allow: ['..'] in
// vite.config permits it) and hands us the file list — no symlink or hand-written manifest.
// Keyed by basename, each value lazily loads the file's raw text.
const fixtures: Record<string, () => Promise<string>> = {};
for (const [path, load] of Object.entries(
	import.meta.glob<string>('../../tests/integration/__data__/*.musicxml', {
		query: '?raw',
		import: 'default',
	}),
)) {
	fixtures[path.slice(path.lastIndexOf('/') + 1).replace('.musicxml', '')] =
		load;
}
const fixtureNames = Object.keys(fixtures).sort();

const STORAGE_KEY = 'vexml:musicxml';

function ResetIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 16 16"
			fill="currentColor"
			className="size-4"
			aria-hidden="true"
		>
			<path
				fillRule="evenodd"
				d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
				clipRule="evenodd"
			/>
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="size-4"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="m4.5 12.75 6 6 9-13.5"
			/>
		</svg>
	);
}

function Or() {
	return (
		<div className="flex items-center gap-2 text-xs text-zinc-400">
			<span className="h-px flex-1 bg-zinc-200" />
			or
			<span className="h-px flex-1 bg-zinc-200" />
		</div>
	);
}

export default function App() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [text, setText] = useState('');
	const [input, setInput] = useState<string | Blob | null>(null);
	const [fixture, setFixture] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [renderMs, setRenderMs] = useState<number | null>(null);
	const [dragging, setDragging] = useState(false);
	const [debouncing, setDebouncing] = useState(false);
	const [resizing, setResizing] = useState(false);
	const [width, setWidth] = useState<number | null>(null);
	const [height, setHeight] = useState<number | null>(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [stored, setStored] = useState(
		() => localStorage.getItem(STORAGE_KEY) !== null,
	);
	const [cleared, setCleared] = useState(false);
	const lastWidthRef = useRef<number | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const resizeRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const roRef = useRef<ResizeObserver | null>(null);
	// The effect below re-renders the last input whenever config changes.
	const [config, setConfig] = useState<Partial<Config>>({});
	const noteSpacing = config.noteSpacing ?? 36;
	const softmaxFactor = config.softmaxFactor ?? 10;
	const reset = (key: 'noteSpacing' | 'softmaxFactor') =>
		setConfig(({ [key]: _, ...rest }) => rest);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || input == null || width == null) {
			return;
		}
		setError(null);
		const start = performance.now();
		render(input, canvas, { ...config, layout: { type: 'standard', width } })
			.then(() => {
				setRenderMs(performance.now() - start);
				setHeight(canvas.clientHeight);
			})
			.catch((e: unknown) => {
				setRenderMs(null);
				setError(e instanceof Error ? e.message : String(e));
			});
	}, [input, config, width]);

	// Reflow the score to the container's width. Callback ref so the observer attaches
	// exactly when the page div mounts (it only exists once there's input). The observer
	// fires once on observe for the initial width, then on viewport changes; debounce so
	// dragging the window doesn't re-render every frame, showing a spinner meanwhile.
	const pageRef = useCallback((el: HTMLDivElement | null) => {
		roRef.current?.disconnect();
		if (!el) {
			return;
		}
		lastWidthRef.current = el.clientWidth;
		setWidth(el.clientWidth);
		const ro = new ResizeObserver(() => {
			// Ignore height-only changes (the canvas grows after each render); only a
			// width change means the score must re-flow.
			if (el.clientWidth === lastWidthRef.current) {
				return;
			}
			clearTimeout(resizeRef.current);
			setResizing(true);
			resizeRef.current = setTimeout(() => {
				setResizing(false);
				lastWidthRef.current = el.clientWidth;
				setWidth(el.clientWidth);
			}, 300);
		});
		ro.observe(el);
		roRef.current = ro;
	}, []);

	// Open with a random example rendered.
	useEffect(() => {
		const name = fixtureNames[Math.floor(Math.random() * fixtureNames.length)];
		if (!name) {
			return;
		}
		setFixture(name);
		fixtures[name]?.().then((xml) => {
			setText(xml);
			setInput(xml);
		});
	}, []);

	function save(value: string) {
		localStorage.setItem(STORAGE_KEY, value);
		setStored(true);
	}

	function clearStorage() {
		localStorage.removeItem(STORAGE_KEY);
		setStored(false);
		setCleared(true);
		setTimeout(() => setCleared(false), 1500);
	}

	function loadFile(file: File) {
		clearTimeout(debounceRef.current);
		setDebouncing(false);
		setFixture('');
		// .mxl is a zip; render() detects MXL from a Blob. MusicXML is plain text we also
		// drop into the textarea so it can be tweaked.
		if (file.name.toLowerCase().endsWith('.mxl')) {
			setText('');
			setInput(file);
			save(`[mxl] ${file.name}`);
		} else {
			file.text().then((t) => {
				setText(t);
				setInput(t);
				save(t);
			});
		}
	}

	function onFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			loadFile(file);
		}
	}

	function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const value = e.target.value;
		setText(value);
		save(value);
		setFixture('');
		clearTimeout(debounceRef.current);
		if (!value.trim()) {
			setDebouncing(false);
			return;
		}
		// Spinner shows while we wait out the typing, then render the settled text.
		setDebouncing(true);
		debounceRef.current = setTimeout(() => {
			setDebouncing(false);
			setInput(value);
		}, 500);
	}

	function onDragOver(e: React.DragEvent) {
		e.preventDefault();
		setDragging(true);
	}

	function onDragLeave(e: React.DragEvent) {
		// Leaving into a child still counts as inside; only clear when truly exiting.
		if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
			setDragging(false);
		}
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) {
			loadFile(file);
		}
	}

	async function onPickFixture(e: React.ChangeEvent<HTMLSelectElement>) {
		const name = e.target.value;
		setFixture(name);
		clearTimeout(debounceRef.current);
		setDebouncing(false);
		const load = fixtures[name];
		if (!load) {
			return;
		}
		const xml = await load();
		setText(xml);
		setInput(xml);
		save(xml);
	}

	return (
		<div className="flex h-screen flex-col bg-zinc-50 text-zinc-900">
			<header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-6 py-2">
				<h1 className="font-mono text-xl font-bold tracking-tight">vexml</h1>
				<a
					href="https://github.com/stringsync/vexml"
					target="_blank"
					rel="noreferrer"
				>
					<img
						src="https://img.shields.io/github/stars/stringsync/vexml?style=social"
						alt="GitHub stars"
					/>
				</a>
			</header>

			<main className="flex min-h-0 flex-1">
				<aside className="fixed inset-x-0 bottom-0 z-20 flex max-h-[75vh] flex-col overflow-y-auto rounded-t-xl border-t border-zinc-200 bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.1)] md:static md:max-h-none md:w-80 md:shrink-0 md:rounded-none md:border-t-0 md:border-r md:shadow-none">
					<button
						type="button"
						onClick={() => setMobileOpen((o) => !o)}
						className="mb-2 py-2 flex w-full items-center justify-center gap-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 active:text-zinc-900 md:hidden"
					>
						{mobileOpen ? 'Hide' : 'Show'}
					</button>

					<div
						className={`flex-col gap-4 ${mobileOpen ? 'flex' : 'hidden'} md:flex`}
					>
						<div className="flex flex-col gap-1.5">
							<span className="text-xs font-medium text-zinc-500">
								Upload file
							</span>
							<label className="cursor-pointer rounded-md bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700">
								Choose File
								<input
									type="file"
									accept=".xml,.musicxml,.mxl"
									className="hidden"
									onChange={onFile}
								/>
							</label>
						</div>

						<Or />

						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="example"
								className="text-xs font-medium text-zinc-500"
							>
								Select an Example
							</label>
							<select
								id="example"
								value={fixture}
								onChange={onPickFixture}
								className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
							>
								<option value="">Load an example…</option>
								{fixtureNames.map((name) => (
									<option key={name} value={name}>
										{name}
									</option>
								))}
							</select>
						</div>

						<Or />

						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="musicxml"
								className="text-xs font-medium text-zinc-500"
							>
								Edit MusicXML
							</label>
							<textarea
								id="musicxml"
								value={text}
								onChange={onTextChange}
								placeholder="Paste MusicXML here"
								spellCheck={false}
								className="h-48 resize-y rounded-md border border-zinc-200 p-2 font-mono text-xs"
							/>
							{debouncing && (
								<div className="flex items-center gap-2 text-xs text-zinc-500">
									<span className="size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
									Rendering…
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={clearStorage}
							disabled={!stored || cleared}
							className="flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{cleared ? (
								<>
									Cleared
									<CheckIcon />
								</>
							) : (
								'Clear local storage'
							)}
						</button>

						<div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
							<span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
								Config
							</span>
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="noteSpacing"
									className="flex items-center justify-between text-xs font-medium text-zinc-500"
								>
									Note spacing
									<span className="flex items-center gap-1.5">
										<span className="font-mono text-zinc-400">
											{noteSpacing}
										</span>
										<button
											type="button"
											onClick={() => reset('noteSpacing')}
											disabled={config.noteSpacing === undefined}
											aria-label="Reset note spacing"
											className="text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
										>
											<ResetIcon />
										</button>
									</span>
								</label>
								<input
									id="noteSpacing"
									type="range"
									min={12}
									max={120}
									step={1}
									value={noteSpacing}
									onChange={(e) =>
										setConfig((c) => ({
											...c,
											noteSpacing: e.target.valueAsNumber,
										}))
									}
								/>
								<p className="text-xs text-zinc-400">
									How much horizontal space notes get: the px a quarter note is
									allotted. Higher spreads every measure wider.
								</p>
							</div>

							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="softmaxFactor"
									className="flex items-center justify-between text-xs font-medium text-zinc-500"
								>
									Softmax factor
									<span className="flex items-center gap-1.5">
										<span className="font-mono text-zinc-400">
											{softmaxFactor}
										</span>
										<button
											type="button"
											onClick={() => reset('softmaxFactor')}
											disabled={config.softmaxFactor === undefined}
											aria-label="Reset softmax factor"
											className="text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
										>
											<ResetIcon />
										</button>
									</span>
								</label>
								<input
									id="softmaxFactor"
									type="range"
									min={1}
									max={30}
									step={1}
									value={softmaxFactor}
									onChange={(e) =>
										setConfig((c) => ({
											...c,
											softmaxFactor: e.target.valueAsNumber,
										}))
									}
								/>
								<p className="text-xs text-zinc-400">
									How that space is divided among notes. Higher exaggerates the
									width difference between long and short notes.
								</p>
							</div>
						</div>
					</div>
				</aside>

				{/* biome-ignore lint/a11y/noStaticElementInteractions: drag-drop zone; Choose File is the keyboard-accessible path */}
				<section
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
					className={`relative min-w-0 flex-1 overflow-auto border-2 border-dashed py-6 pb-20 sm:px-6 md:pb-6 ${dragging ? 'border-blue-400 bg-blue-50/40' : 'border-transparent'}`}
				>
					{error ? (
						<pre className="mx-auto mb-4 w-fit whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
							{error}
						</pre>
					) : (
						renderMs != null && (
							<p className="mx-auto mb-6 w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
								Rendered in {renderMs.toFixed(1)} ms
							</p>
						)
					)}
					{input != null && (
						// White page sized like a real sheet; music reflows to its width. Horizontal
						// padding (and the paper inset) collapse on small viewports for max room.
						<div className="relative mx-auto w-full max-w-225 bg-white px-2 py-8 shadow-md ring-1 ring-zinc-200 sm:p-16">
							{width != null && height != null && (
								<span className="absolute top-1 left-1 font-mono text-[10px] text-zinc-400">
									{Math.round(width)}×{Math.round(height)}
								</span>
							)}
							<div ref={pageRef}>
								<canvas ref={canvasRef} className="block" />
							</div>
						</div>
					)}
					{resizing && (
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
							<div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-5 shadow-lg">
								<span className="size-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-600" />
								<span className="text-sm font-medium text-zinc-600">
									Loading…
								</span>
							</div>
						</div>
					)}
				</section>
			</main>
		</div>
	);
}

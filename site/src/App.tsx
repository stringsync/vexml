import { useEffect, useRef, useState } from 'react';
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

export default function App() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [text, setText] = useState('');
	const [input, setInput] = useState<string | Blob | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [fixture, setFixture] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [renderMs, setRenderMs] = useState<number | null>(null);
	// Knobs go here: switch to `const [config, setConfig]` and wire inputs to setConfig.
	// The effect below re-renders the last input whenever config changes.
	const [config] = useState<Partial<Config>>({});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || input == null) {
			return;
		}
		setError(null);
		const start = performance.now();
		render(input, canvas, config)
			.then(() => setRenderMs(performance.now() - start))
			.catch((e: unknown) => {
				setRenderMs(null);
				setError(e instanceof Error ? e.message : String(e));
			});
	}, [input, config]);

	function onFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}
		setFileName(file.name);
		setFixture('');
		// .mxl is a zip; render() detects MXL from a Blob. MusicXML is plain text we also
		// drop into the textarea so it can be tweaked.
		if (file.name.toLowerCase().endsWith('.mxl')) {
			setText('');
			setInput(file);
		} else {
			file.text().then((t) => {
				setText(t);
				setInput(t);
			});
		}
	}

	async function onPickFixture(e: React.ChangeEvent<HTMLSelectElement>) {
		const name = e.target.value;
		setFixture(name);
		const load = fixtures[name];
		if (!load) {
			return;
		}
		const xml = await load();
		setFileName(`${name}.musicxml`);
		setText(xml);
		setInput(xml);
	}

	return (
		<div className="flex h-screen flex-col bg-zinc-50 text-zinc-900">
			<header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
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
				<aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 bg-white p-4">
					<label className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700">
						Upload MusicXML / MXL
						<input
							type="file"
							accept=".xml,.musicxml,.mxl"
							className="hidden"
							onChange={onFile}
						/>
					</label>

					<select
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

					{fileName && (
						<p className="truncate text-xs text-zinc-500">{fileName}</p>
					)}

					<div className="flex flex-col gap-2">
						<textarea
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="…or paste MusicXML here"
							spellCheck={false}
							className="h-48 resize-y rounded-md border border-zinc-200 p-2 font-mono text-xs"
						/>
						<button
							type="button"
							onClick={() => setInput(text)}
							disabled={!text.trim()}
							className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-40"
						>
							Render
						</button>
						{renderMs != null && !error && (
							<p className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
								Rendered in {renderMs.toFixed(1)} ms
							</p>
						)}
					</div>

					{error && (
						<pre className="whitespace-pre-wrap rounded-md bg-red-50 p-2 text-xs text-red-700">
							{error}
						</pre>
					)}

					{/* config knobs go here */}
				</aside>

				<section className="min-w-0 flex-1 overflow-auto p-6">
					<canvas ref={canvasRef} />
					{input == null && (
						<p className="text-sm text-zinc-400">
							Upload a file or paste MusicXML to render.
						</p>
					)}
				</section>
			</main>
		</div>
	);
}

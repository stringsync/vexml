import { writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { type Renderer, renderers } from '@vexml/renderer';
import type { Logger } from 'webappwiz/log';
import type { Fs } from 'webappwiz/system';

// MusicXML in, PNG out, through whichever engine the flag picks. vexml is the
// point; the other three are reference renderers for checking vexml against when
// the correct engraving is unclear (each has its own house style and its own
// bugs — second opinions, not ground truth).
export async function render(opts: {
	input: string;
	output?: string;
	config?: string;
	muse?: boolean;
	osmd?: boolean;
	alpha?: boolean;
	cwd: string;
	log: Logger;
	fs: Fs;
}) {
	// index.ts chdir'd to the repo root, so resolve user paths against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));
	const musicXML = await opts.fs.read(at(opts.input));

	let name: string;
	let renderer: Renderer;
	if (opts.muse) {
		name = 'musescore';
		renderer = renderers.musescore({ musicXML });
	} else if (opts.osmd) {
		name = 'osmd';
		renderer = renderers.osmd({ musicXML });
	} else if (opts.alpha) {
		name = 'alphatab';
		renderer = renderers.alphatab({ musicXML });
	} else {
		name = 'vexml';
		// Passed straight through as a Partial<Config>; render fills the rest from
		// DEFAULT_CONFIG, so this knows nothing about config's shape.
		const config = opts.config ? JSON.parse(opts.config) : {};
		renderer = renderers.vexml({ musicXML, config });
	}

	const output = at(opts.output ?? `${name} ${timestamp()}.png`);
	let png: Buffer;
	try {
		png = await renderer.render();
		// Fs is text-only, so the PNG goes out through node:fs.
		writeFileSync(output, png);
	} finally {
		await renderers.disposeAsync();
	}
	opts.log.info(`wrote ${output} (${dimensions(png)})`);
}

// A PNG's IHDR is always the first chunk, so width and height sit at fixed
// offsets: 8 bytes of signature, 8 of chunk header, then the two big-endian
// uint32s. ponytail: no image-size dependency for two reads.
function dimensions(png: Buffer): string {
	return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

function timestamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

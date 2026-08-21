import * as path from 'node:path';
import type { ConfigInput } from '@stringsync/vexml';
import {
	type EvalRenderer,
	type Image,
	type RenderResult,
	renderers,
	type VexmlContext,
} from '@vexml/renderer';

const DATA_DIR = path.resolve(import.meta.dir, './__data__');

/**
 * The suite's view of renderers.vexml: resolves corpus fixtures and defaults both
 * fonts to the families the Docker image installs, so a test states only what it is
 * about. render/eval mirror the Renderer/EvalRenderer verbs. setup.ts constructs the
 * run's one shared instance (`testing`); importing a module never constructs anything.
 */
export class Testing {
	/** Render a corpus file and return its pixels. */
	async render(file: string, config: ConfigInput = {}): Promise<Image> {
		return (await this.vexml(file, config)).render();
	}

	/** Render a corpus file and run fn against the live render (see EvalRenderer for
	 * the no-closures contract). The image reflects whatever fn did. */
	async eval<T, A = undefined>(
		file: string,
		config: ConfigInput,
		fn: (ctx: VexmlContext, arg: A) => T | Promise<T>,
		arg?: A,
	): Promise<RenderResult<T>> {
		return (await this.vexml(file, config)).eval(fn, arg);
	}

	/** A corpus fixture's text — for the rare eval fn that needs one as its arg. */
	fixture(file: string): Promise<string> {
		return Bun.file(path.join(DATA_DIR, file)).text();
	}

	private async vexml(
		file: string,
		config: ConfigInput,
	): Promise<EvalRenderer<VexmlContext>> {
		const fixture = Bun.file(path.join(DATA_DIR, file));
		const withFonts = this.withDefaultFonts(config);
		return file.endsWith('.mxl')
			? renderers.vexml({ mxl: await fixture.bytes(), config: withFonts })
			: renderers.vexml({ musicXML: await fixture.text(), config: withFonts });
	}

	/* Default both fonts to the families the Docker image installs as system fonts (see
	 * Dockerfile). Passing a family with no URL takes the font loader's "already
	 * available" path — the browser resolves it locally instead of fetching Bravura's
	 * woff2 or Source Sans 3 from the Google Fonts CDN, so renders never touch the
	 * network. A test that sets fonts.notation or fonts.text (spread last) overrides
	 * the default. */
	private withDefaultFonts(config: ConfigInput): ConfigInput {
		return {
			...config,
			fonts: {
				notation: { family: 'Bravura' },
				text: { family: 'Source Sans 3' },
				...config.fonts,
			},
		};
	}
}

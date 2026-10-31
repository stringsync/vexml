import ts from '@typescript/typescript6';
import type { BunPlugin } from 'bun';
import type { Fs } from 'core/system';
import { fileUrl } from './bundle';

/** @internal Diagnostic bundler hook for archived renderers in the lint corpus. */
export class HistoryInkSource {
	constructor(
		private readonly root: string,
		private readonly fs: Fs,
	) {}

	plugin(): BunPlugin {
		return {
			name: 'historical-ink',
			setup: (build) => {
				build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async ({ path, loader }) => {
					let source = await this.fs.read(path);
					if (path.startsWith(this.root)) {
						source = this.instrument(source, path);
					}
					if (source.includes('import.meta.url')) {
						source = source.replaceAll(
							'import.meta.url',
							JSON.stringify(fileUrl(path)),
						);
					}
					return { contents: source, loader };
				});
			},
		};
	}

	private instrument(source: string, path: string): string {
		if (
			source.includes('const context = renderer.getContext();') &&
			source.includes("const scratch = document.createElement('canvas');")
		) {
			const helper = new URL('./legacy-ink-recording.ts', import.meta.url)
				.pathname;
			source = `import {LegacyInkRecording} from ${JSON.stringify(helper)};\n${source}`;
			source = source.replace(
				'const context = renderer.getContext();',
				'const __ink = new LegacyInkRecording(scratch); const context = __ink.context;',
			);
			source = source.replaceAll(
				'renderer.resize(width, scratchHeight);',
				'renderer.resize(width, scratchHeight); __ink.reset();',
			);
			const finish =
				'const dpr = scratch.width / parseFloat(scratch.style.width);';
			if (!source.includes(finish)) {
				throw new Error(`historical capture: unknown crop in ${path}`);
			}
			source = source.replace(finish, `__ink.finish(cropTop); ${finish}`);
		}
		const tree = ts.createSourceFile(
			path,
			source,
			ts.ScriptTarget.Latest,
			true,
			path.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
		);
		const edits: Array<{ at: number; text: string }> = [];
		const custom: Record<string, string> = {
			drawHarmony: 'harmony',
			drawTempo: 'tempo',
			drawWords: 'words',
			drawRehearsal: 'rehearsal',
			drawBarlineFermata: 'fermata',
		};
		const visit = (node: ts.Node): void => {
			if (
				(ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) &&
				node.body &&
				node.name
			) {
				const name = node.name.getText(tree),
					body = node.body.getText(tree);
				const kind =
					custom[name] ??
					(name === 'draw' && path.endsWith('/chord-diagram-glyph.ts')
						? 'chord-diagram'
						: undefined);
				let context: string | undefined, group: string | undefined;
				if (kind) {
					if (node.parameters.some((p) => p.name.getText(tree) === 'context')) {
						context = 'context';
					} else if (body.includes('this.context')) {
						context = 'this.context';
					}
					group = `vexml-${kind}`;
				} else if (
					path.includes('/node_modules/vexflow/') &&
					name === 'draw' &&
					body.includes('this.checkContext(')
				) {
					context = 'this.checkContext()';
					group = path.split('/').at(-1)?.replace(/\.js$/, '');
				}
				if (context && group) {
					edits.push({
						at: node.body.getStart(tree) + 1,
						text: `\n${context}.openGroup(${JSON.stringify(group)}); try {\n`,
					});
					edits.push({
						at: node.body.end - 1,
						text: `\n} finally { ${context}.closeGroup(); }\n`,
					});
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(tree);
		for (const edit of edits.sort((a, b) => b.at - a.at)) {
			source = source.slice(0, edit.at) + edit.text + source.slice(edit.at);
		}
		return source;
	}
}

import { describe, expect, it } from 'bun:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { ensure } from 'webappwiz/assert';
import { AsyncDisposer } from 'webappwiz/disposable';

// Vite exercises the same module graph as the dev site, including the workspace library.
describe('dev site editing', () => {
	it('keeps the compact toolbar and navigates notes without editing', async () => {
		const disposer = new AsyncDisposer();
		const cleanupErrors: unknown[] = [];
		try {
			const server = await createServer({
				root: 'packages/site',
				server: { port: 0 },
			});
			// AsyncDisposer stops at the first rejection, so report failures after every release.
			disposer.defer(() =>
				server.close().catch((error) => {
					cleanupErrors.push(error);
				}),
			);
			await server.listen();
			const browser = await chromium.launch({
				headless: true,
				args: ['--no-sandbox'],
			});
			disposer.defer(() =>
				browser.close().catch((error) => {
					cleanupErrors.push(error);
				}),
			);
			const page = await browser.newPage({
				viewport: { width: 1440, height: 1000 },
			});
			const errors: string[] = [];
			page.on('pageerror', (error) => errors.push(error.message));
			const url = ensure.present(
				server.resolvedUrls?.local[0],
				'Missing dev server URL',
			);
			page.setDefaultTimeout(7000);
			await page.route('https://**', (route) => route.abort());
			const original = await Bun.file('packages/site/editing.musicxml').text();
			await page.addInitScript(
				(xml) => localStorage.setItem('vexml:musicxml', xml),
				original,
			);
			await page.goto(url, { waitUntil: 'domcontentloaded' });
			await page.getByRole('radio', { name: 'Edit', exact: true }).click();
			const score = page.getByRole('application', {
				name: 'Score',
				exact: true,
			});
			await score.locator('canvas[style*="z-index: 2"]').waitFor();
			await score.focus();
			const selectionBefore = await score
				.locator('canvas[style*="z-index: 2"]')
				.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
			await page.keyboard.press('ArrowRight');
			const selectionAfter = await score
				.locator('canvas[style*="z-index: 2"]')
				.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
			expect(selectionAfter).not.toBe(selectionBefore);
			// Dismiss a range from either input path without moving its endpoint cursor.
			const selectionCanvas = score.locator('canvas[style*="z-index: 2"]');
			for (const dismiss of ['escape', 'outside']) {
				const cursor = await selectionCanvas.evaluate((canvas) =>
					(canvas as HTMLCanvasElement).toDataURL(),
				);
				await page.keyboard.press('ArrowRight');
				await page.keyboard.press('Shift+ArrowLeft');
				expect(
					await selectionCanvas.evaluate((canvas) =>
						(canvas as HTMLCanvasElement).toDataURL(),
					),
				).not.toBe(cursor);
				if (dismiss === 'escape') {
					await page.keyboard.press('Escape');
				} else {
					await score.click({ position: { x: 5, y: 5 } });
				}
				expect(
					await selectionCanvas.evaluate((canvas) =>
						(canvas as HTMLCanvasElement).toDataURL(),
					),
				).toBe(cursor);
			}
			await page.keyboard.press('ArrowUp');
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('ArrowLeft');
			await page.keyboard.press('c');
			await page.keyboard.press('1');
			await page.keyboard.press('Enter');
			expect(
				await page.evaluate(() => localStorage.getItem('vexml:musicxml')),
			).toBe(original);
			expect(
				await page
					.getByRole('group', { name: 'Note duration', exact: true })
					.count(),
			).toBe(0);
			expect(
				await page.getByRole('button', { name: 'Undo', exact: true }).count(),
			).toBe(0);
			expect(
				await page
					.getByRole('status', { name: 'Note entry', exact: true })
					.count(),
			).toBe(0);
			await page
				.getByText('Loading…', { exact: true })
				.waitFor({ state: 'hidden' });
			await page.screenshot({
				path: 'packages/integration/__artifacts__/editing-site-desktop.png',
			});
			await page.setViewportSize({ width: 390, height: 844 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth,
				),
			).toBe(true);
			await page
				.getByText('Loading…', { exact: true })
				.waitFor({ state: 'hidden' });
			await page.screenshot({
				path: 'packages/integration/__artifacts__/editing-site-mobile.png',
			});
			expect(
				await page
					.getByRole('button', { name: 'New notation', exact: true })
					.count(),
			).toBe(0);
			expect(
				await page.getByLabel('Rendering time', { exact: true }).textContent(),
			).toMatch(/Rendered in \d+\.\d ms/);

			expect(errors).toEqual([]);
		} finally {
			await disposer.disposeAsync();
			expect(cleanupErrors).toEqual([]);
		}
	}, 30_000);
	it('preserves document selection and scroll, rebuilds playback, and retains undo after rendering fails', async () => {
		const disposer = new AsyncDisposer();
		const cleanupErrors: unknown[] = [];
		try {
			const server = await createServer({
				root: 'packages/site',
				server: { port: 0 },
			});
			// AsyncDisposer stops at the first rejection, so report failures after every release.
			disposer.defer(() =>
				server.close().catch((error) => {
					cleanupErrors.push(error);
				}),
			);
			await server.listen();
			const browser = await chromium.launch({
				headless: true,
				args: ['--no-sandbox'],
			});
			disposer.defer(() =>
				browser.close().catch((error) => {
					cleanupErrors.push(error);
				}),
			);
			const page = await browser.newPage();
			const url = ensure.present(
				server.resolvedUrls?.local[0],
				'Missing dev server URL',
			);
			await page.route(`${url}model-test`, (route) =>
				route.fulfill({
					contentType: 'text/html',
					body: '<div id="score" tabindex="0" style="width:500px"></div>',
				}),
			);
			await page.goto(`${url}model-test`);
			const xml = await Bun.file(
				'packages/integration/__data__/note.musicxml',
			).text();
			const result = await page.evaluate(async (xml) => {
				const assertionPath = '/@id/webappwiz/assert';
				const { ensure }: typeof import('webappwiz/assert') = await import(
					assertionPath
				);
				const modulePath = '/lib/site-model.ts';
				const { SiteModel } = await import(modulePath);
				const model: import('./lib/site-model').SiteModel = new SiteModel(
					{ names: () => [], load: () => undefined },
					localStorage,
				);
				const container = ensure.present(
					document.querySelector<HTMLDivElement>('#score'),
					'Missing score container',
				);
				const config = {
					maxHeight: 60,
					layout: { type: 'standard' as const, referenceWidth: 300 },
					fonts: {
						notation: { family: 'Bravura' },
						text: { family: 'Source Sans 3' },
					},
				};
				model.document.edit(xml, { immediate: true });
				await model.renderInto(container, {
					input: model.document.input,
					format: 'musicxml',
					config,
				});
				model.setMode('edit');
				const editor = ensure.present(model.editor, 'Missing editor');
				const first = ensure.present(
					editor.document.score.parts[0]?.measures[0]?.notes[0],
					'Missing document note',
				);
				editor.select(first);
				model.session?.cursor.cancelScroll();
				container.scrollTop = 20;
				container.focus();
				const originalScroll = container.scrollTop;
				editor.setPitch({ step: 'F', octave: 5 });
				await model.renderInto(container, {
					input: model.document.input,
					format: 'musicxml',
					config,
				});
				const afterEdit = {
					sameEditor: model.editor === editor,
					sameFocus: editor.getFocus() === first,
					focused: document.activeElement === container,
					scroll: container.scrollTop,
					pitch: model.session?.score
						.getSequence()
						.getSteps()[0]
						?.active[0]?.getPitch(),
					sourceUpdated: model.document.text.includes('<step>F</step>'),
				};
				await model.renderInto(container, {
					input: model.document.input,
					format: 'musicxml',
					config: {
						...config,
						gaps: [{ beforeMeasureIndex: 0, durationMs: 1000 }],
					},
				});
				const afterFailure = {
					failed: model.error !== null,
					noScore: model.session === null,
					canUndo: model.noteEditing?.editor.history.canUndo,
				};
				editor.undo();
				await model.renderInto(container, {
					input: model.document.input,
					format: 'musicxml',
					config,
				});
				const recovered = {
					error: model.error,
					pitch: model.session?.score
						.getSequence()
						.getSteps()[0]
						?.active[0]?.getPitch(),
					sameFocus: editor.getFocus() === first,
				};
				model.dispose();
				return { originalScroll, afterEdit, afterFailure, recovered };
			}, xml);
			expect(result).toEqual({
				originalScroll: 20,
				afterEdit: {
					sameEditor: true,
					sameFocus: true,
					focused: true,
					scroll: 20,
					pitch: 'F/5',
					sourceUpdated: true,
				},
				afterFailure: { failed: true, noScore: true, canUndo: true },
				recovered: { error: null, pitch: 'C/5', sameFocus: true },
			});
		} finally {
			await disposer.disposeAsync();
			expect(cleanupErrors).toEqual([]);
		}
	}, 30_000);
});

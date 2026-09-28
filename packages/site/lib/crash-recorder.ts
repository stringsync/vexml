import { Disposer, type Resource } from 'webappwiz/disposable';
import { Duration, type Timer } from 'webappwiz/time';
import type { CrashLog } from './crash-log';

/* Where the score came from; DocumentSource satisfies it. */
export interface NamedDocument {
	readonly fixture: string;
}

const INPUTS = ['pointerdown', 'pointermove', 'pointerup', 'keydown'] as const;

/*
 * Feeds a CrashLog from the live page: once a second, and on every score render (a render is the
 * biggest allocation the site makes, and a kill can follow it before the next tick), it writes
 * the canvas memory in the DOM, how many renders have run, and what the user was last doing.
 */
export class CrashRecorder implements Resource {
	private readonly disposer = new Disposer();
	private renders = 0;
	private lastInput = 'none';
	private inputs: number[] = [];

	constructor(
		private readonly log: CrashLog,
		private readonly document: NamedDocument,
		timer: Timer,
	) {
		this.disposer.use(
			timer.setInterval(() => this.sample(), Duration.ms(1000)),
		);

		const observer = new MutationObserver((records) => {
			for (const record of records) {
				for (const node of Array.from(record.addedNodes)) {
					if (
						node instanceof HTMLCanvasElement &&
						node.classList.contains('vexml-canvas')
					) {
						this.renders++;
						this.sample();
					}
				}
			}
		});
		observer.observe(window.document.body, { childList: true, subtree: true });
		this.disposer.defer(() => observer.disconnect());

		const onInput = (e: Event) => this.input(e);
		for (const type of INPUTS) {
			window.addEventListener(type, onInput, { capture: true, passive: true });
			this.disposer.defer(() =>
				window.removeEventListener(type, onInput, { capture: true }),
			);
		}

		const onPageHide = () => this.log.exitCleanly();
		window.addEventListener('pagehide', onPageHide);
		this.disposer.defer(() =>
			window.removeEventListener('pagehide', onPageHide),
		);
	}

	dispose(): void {
		this.disposer.dispose();
	}

	private input(e: Event): void {
		const now = performance.now();
		this.inputs.push(now);
		const target = e.target instanceof Element ? e.target : null;
		const label =
			target?.closest('[aria-label]')?.getAttribute('aria-label') ??
			target?.tagName.toLowerCase() ??
			'window';
		const kind = e instanceof PointerEvent ? ` (${e.pointerType})` : '';
		this.lastInput = `${e.type}${kind} on ${label}`;
	}

	private sample(): void {
		const now = performance.now();
		this.inputs = this.inputs.filter((t) => now - t < 1000);
		const canvases = Array.from(window.document.querySelectorAll('canvas'));
		const pixels = canvases.reduce((n, c) => n + c.width * c.height, 0);
		this.log.record({
			at: new Date().toISOString(),
			fixture: this.document.fixture,
			canvasMb: Math.round((pixels * 4) / 1e6),
			canvases: canvases.length,
			renders: this.renders,
			lastInput: this.lastInput,
			inputsPerSecond: this.inputs.length,
			userAgent: navigator.userAgent,
		});
	}
}

import type { Decorations } from './decoration';
import { FakeDecoration } from './fake-decoration';

/* Fake fulfilling the Decorations seam (preferred over mocks): a recording store per kind, so a
 * test can toggle an element's color or halo and read back what was set. Test-only — excluded
 * from the published package via package.json "files". */
export class FakeDecorations implements Decorations {
	readonly color = new FakeDecoration();
	readonly halo = new FakeDecoration();
}

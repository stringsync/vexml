// The layout the engraving tests write beside each screenshot (`__marks__/engraving_<fixture>.geometry.json`):
// where each measure and staff landed, so a rule check's `Crop:` can be cut in score terms.

import * as path from 'node:path';
import type { Fs } from 'core/system';
import { z } from 'zod';
import type { RenderGeometry } from './rule-checks';

export const MARKS_DIR = 'packages/integration/__marks__';

const geometrySchema = z.object({
	screenshot: z.string(),
	measures: z.array(
		z.object({
			index: z.number(),
			system: z.number(),
			x: z.number(),
			w: z.number(),
		}),
	),
	staves: z.array(
		z.object({
			part: z.number(),
			measure: z.number(),
			staff: z.number(),
			lines: z.array(z.number()),
			x: z.number(),
			w: z.number(),
		}),
	),
});

/** Parses a `*.geometry.json` the engraving tests write, or null when it does not fit. */
export function parseRenderGeometry(json: unknown): RenderGeometry | null {
	const parsed = geometrySchema.safeParse(json);
	return parsed.success ? parsed.data : null;
}

/** The layout the test harness wrote for a fixture's screenshot, or null when missing. */
export async function readGeometry(
	fs: Pick<Fs, 'exists' | 'read'>,
	fixtureName: string,
): Promise<RenderGeometry | null> {
	const file = path.join(MARKS_DIR, `engraving_${fixtureName}.geometry.json`);
	if (!(await fs.exists(file))) {
		return null;
	}
	return parseRenderGeometry(JSON.parse(await fs.read(file)));
}

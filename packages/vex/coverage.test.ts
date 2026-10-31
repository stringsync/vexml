import { describe, expect, it } from 'bun:test';
import { NodeFs } from 'core/system';
import { CoverageReader, TABLE_PATH } from './coverage';

const ROOT = `${import.meta.dir}/../..`;

describe('coverage', () => {
	it('has a row for every element in the MusicXML schema', async () => {
		const fs = new NodeFs();
		const table = await new CoverageReader(fs).readCoverage(ROOT);
		// Out of step: run `vex coverage`, then fill in the new rows' statuses.
		expect(await fs.read(`${ROOT}/${TABLE_PATH}`)).toBe(table.render());
	});

	it('proves each drawn row with a fixture that uses it', async () => {
		const fs = new NodeFs();
		const table = await new CoverageReader(fs).readCoverage(ROOT);
		expect(
			table.problems(await new CoverageReader(fs).readFixtures(ROOT)),
		).toEqual([]);
	});
});

import type { Logger } from 'core/log';
import type { Fs } from 'core/system';
import { CoverageTable } from './coverage-table';
import { XsdSchema } from './xsd-schema';

export const SCHEMA_PATH = 'packages/vex/xmllint/schema/musicxml.xsd';
export const TABLE_PATH = 'packages/integration/COVERAGE.md';
export const FIXTURES_DIR = 'packages/integration/__data__';

export interface CoverageOptions {
	log: Logger;
	fs: Fs;
}

/** Brings the coverage table into step with the schema, then reports what is wrong
 * with its `drawn` rows. Paths are from the repo root, where index.ts runs. */
export async function coverage(opts: CoverageOptions) {
	const reader = new CoverageReader(opts.fs);
	const table = await reader.readCoverage('.');
	await opts.fs.write(TABLE_PATH, table.render());
	opts.log.info(`wrote ${TABLE_PATH}`);
	for (const line of table.summary()) {
		opts.log.info(line);
	}
	const problems = table.problems(await reader.readFixtures('.'));
	if (problems.length > 0) {
		throw new Error(problems.join('\n'));
	}
}

/** Reads the coverage table and the fixtures under a repo root. */
export class CoverageReader {
	constructor(private readonly fs: Fs) {}

	/** The table on disk under the repo `root`, synced to the schema on disk. */
	async readCoverage(root: string): Promise<CoverageTable> {
		const schema = new XsdSchema(await this.fs.read(`${root}/${SCHEMA_PATH}`));
		const table = `${root}/${TABLE_PATH}`;
		const markdown = (await this.fs.exists(table))
			? await this.fs.read(table)
			: '';
		return CoverageTable.parse(markdown).sync(schema.elements());
	}

	/** Every fixture's text under the repo `root`, by file name. */
	async readFixtures(root: string): Promise<Map<string, string>> {
		const dir = `${root}/${FIXTURES_DIR}`;
		const names = (await this.fs.readdir(dir)).filter((n) =>
			n.endsWith('.musicxml'),
		);
		const texts = await Promise.all(
			names.map((n) => this.fs.read(`${dir}/${n}`)),
		);
		return new Map(names.map((n, i) => [n, texts[i] ?? '']));
	}
}

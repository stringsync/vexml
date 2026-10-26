/** How far vexml goes with one MusicXML element or attribute. */
export type CoverageStatus = 'drawn' | 'ignored' | 'missing';

export interface CoverageRow {
	/** The element's name, or `*` for an attribute shared by many elements. */
	element: string;
	/** Set on an attribute's row; unset on the element's own. */
	attribute?: string;
	status: CoverageStatus;
	/**
	 * For `drawn`, the fixtures under packages/integration/__data__ that show it,
	 * each in backticks, before any words; for `ignored`, why; for `missing`, what
	 * drawing it would take.
	 */
	note: string;
}

const STATUSES: readonly CoverageStatus[] = ['drawn', 'ignored', 'missing'];

const HEADER = '| Element | Status | Proof or reason |';
const DIVIDER = '| --- | --- | --- |';

/**
 * The MusicXML coverage table: a row for every element the schema declares, and
 * a row for each attribute picked by hand as one that changes what is drawn.
 *
 * Read from and written to markdown. The rows are the only part kept between
 * writes: the prose and the tally around them are rewritten every time.
 */
export class CoverageTable {
	constructor(readonly rows: readonly CoverageRow[]) {}

	/** Throws on a row it cannot read. */
	static parse(markdown: string): CoverageTable {
		const lines = markdown.split('\n');
		const start = lines.indexOf(HEADER);
		if (start < 0) {
			return new CoverageTable([]);
		}
		const rows: CoverageRow[] = [];
		for (const line of lines.slice(start + 2)) {
			if (!line.startsWith('|')) {
				break;
			}
			rows.push(parseRow(line));
		}
		return new CoverageTable(rows);
	}

	/**
	 * A row for every element in the schema, in name order, each attribute row
	 * under its element. Rows already here keep their status and note; a new
	 * element arrives as `missing`. Throws on a row the schema has no place for,
	 * which a person has to settle: a typo, or an element MusicXML dropped.
	 */
	sync(schema: ReadonlyMap<string, ReadonlySet<string>>): CoverageTable {
		const problems: string[] = [];
		const shared = new Set([...schema.values()].flatMap((a) => [...a]));
		for (const row of this.rows) {
			const known =
				row.element === '*'
					? row.attribute !== undefined && shared.has(row.attribute)
					: schema.has(row.element) &&
						(row.attribute === undefined ||
							(schema.get(row.element)?.has(row.attribute) ?? false));
			if (!known) {
				problems.push(`${keyOf(row)} is not in the MusicXML 4.0 schema`);
			}
		}
		const keys = new Map<string, CoverageRow>();
		for (const row of this.rows) {
			if (keys.has(keyOf(row))) {
				problems.push(`${keyOf(row)} has more than one row`);
			}
			keys.set(keyOf(row), row);
		}
		if (problems.length > 0) {
			throw new Error(problems.join('\n'));
		}

		const rows: CoverageRow[] = [];
		for (const element of ['*', ...schema.keys()]) {
			const own = keys.get(element);
			if (element !== '*') {
				rows.push(own ?? { element, status: 'missing', note: '' });
			}
			const attributes = this.rows
				.filter((r) => r.element === element && r.attribute !== undefined)
				.sort((a, b) => (a.attribute ?? '').localeCompare(b.attribute ?? ''));
			rows.push(...attributes);
		}
		return new CoverageTable(rows);
	}

	/**
	 * What is wrong with the `drawn` rows: each has to name a fixture, and every
	 * fixture it names has to hold the element (and the attribute, on an
	 * attribute's row). `fixtures` maps a fixture's file name to its text.
	 */
	problems(fixtures: ReadonlyMap<string, string>): string[] {
		const problems: string[] = [];
		for (const row of this.rows) {
			if (row.status !== 'drawn') {
				continue;
			}
			const names = fixturesOf(row.note);
			if (names.length === 0) {
				problems.push(`${keyOf(row)} is drawn but names no fixture`);
			}
			for (const name of names) {
				const xml = fixtures.get(name);
				if (xml === undefined) {
					problems.push(`${keyOf(row)} names ${name}, which does not exist`);
				} else if (!holds(xml, row)) {
					problems.push(`${keyOf(row)} names ${name}, which does not use it`);
				}
			}
		}
		return problems;
	}

	/** The element and attribute totals. Kept out of the file, where every
	 * parallel change to a row would conflict on them. */
	summary(): string[] {
		const elements = this.rows.filter((r) => r.attribute === undefined);
		const attributes = this.rows.filter((r) => r.attribute !== undefined);
		const tally = (rows: CoverageRow[]) =>
			STATUSES.map(
				(status) =>
					`${rows.filter((r) => r.status === status).length} ${status}`,
			).join(', ');
		const drawn = elements.filter((r) => r.status === 'drawn').length;
		const counted = elements.filter((r) => r.status !== 'ignored').length;
		const share = counted === 0 ? 0 : Math.round((drawn / counted) * 100);
		return [
			`Elements: ${tally(elements)}; vexml draws ${drawn} of the ${counted} that show on the page (${share}%).`,
			`Attributes: ${tally(attributes)}.`,
		];
	}

	/** The whole file: a preamble and the rows. */
	render(): string {
		return [
			'# MusicXML 4.0 coverage',
			'',
			'What vexml does with each element of the MusicXML 4.0 schema',
			'(`packages/vex/xmllint/schema/musicxml.xsd`), and with the attributes that',
			'change what is drawn. `vex coverage` writes this file and prints the totals: it adds a `missing`',
			'row for each element the schema has and the table lacks, and keeps every',
			'status and note already here, so edit those by hand. `vex test` fails while',
			'the table is out of step with the schema, or a `drawn` row names a fixture',
			'in `__data__` that does not use what the row is about.',
			'',
			'- **drawn**: vexml draws it, and the named fixtures show it.',
			'- **ignored**: on purpose, as sound or metadata nothing displays.',
			'- **missing**: on the page, but vexml does not draw it yet.',
			'',
			'An attribute row reads `element@attribute`, or `*@attribute` for one shared',
			'by many elements. Element rows are one per schema element; attribute rows',
			'are picked by hand.',
			'',
			HEADER,
			DIVIDER,
			...this.rows.map(renderRow),
			'',
		].join('\n');
	}
}

function parseRow(line: string): CoverageRow {
	const cells = line
		.slice(1, line.endsWith('|') ? -1 : undefined)
		.split('|')
		.map((cell) => cell.trim());
	const [key = '', status = '', note = ''] = cells;
	const match = /^`([^`@]+)(?:@([^`]+))?`$/.exec(key);
	if (!match?.[1] || cells.length !== 3) {
		throw new Error(`cannot read coverage row: ${line}`);
	}
	if (!STATUSES.includes(status as CoverageStatus)) {
		throw new Error(`unknown status "${status}" in coverage row: ${line}`);
	}
	return {
		element: match[1],
		attribute: match[2],
		status: status as CoverageStatus,
		note,
	};
}

function renderRow(row: CoverageRow): string {
	return `| \`${keyOf(row)}\` | ${row.status} | ${row.note} |`.replace(
		/ {2}\|$/,
		' |',
	);
}

function keyOf(row: CoverageRow): string {
	return row.attribute === undefined
		? row.element
		: `${row.element}@${row.attribute}`;
}

// The backticked names leading a note, as "`a.musicxml`, `b.musicxml`: why".
function fixturesOf(note: string): string[] {
	const lead = /^(`[^`]+\.musicxml`(?:,\s*`[^`]+\.musicxml`)*)/.exec(note);
	return lead?.[1]
		? [...lead[1].matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '')
		: [];
}

function holds(xml: string, row: CoverageRow): boolean {
	const tag = row.element === '*' ? '[\\w:-]+' : escapeRegex(row.element);
	const pattern =
		row.attribute === undefined
			? `<${tag}[\\s/>]`
			: `<${tag}\\s(?:[^>]*\\s)?${escapeRegex(row.attribute)}=`;
	return new RegExp(pattern).test(xml);
}

function escapeRegex(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

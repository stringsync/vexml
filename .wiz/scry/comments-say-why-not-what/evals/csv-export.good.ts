export interface Column<Row> {
	header: string;
	value: (row: Row) => string | number;
}

export function toCsv<Row>(rows: Row[], columns: Column<Row>[]): string {
	const header = columns.map((c) => quote(c.header)).join(",");
	const lines = rows.map((row) =>
		columns.map((c) => quote(String(c.value(row)))).join(","),
	);
	return [header, ...lines].join("\r\n");
}

function quote(cell: string): string {
	return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

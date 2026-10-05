function escapeCell(value: string): string {
	return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

export class MarkdownTable {
	private rows: string[][] = [];

	constructor(private headers: string[]) {}

	add(...cells: string[]): this {
		this.rows.push(cells);
		return this;
	}

	toString(): string {
		const lines = [this.headers, this.headers.map(() => "---"), ...this.rows];
		return lines.map((cells) => `| ${cells.map(escapeCell).join(" | ")} |`).join("\n");
	}
}

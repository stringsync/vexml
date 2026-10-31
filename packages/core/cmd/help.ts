import { color } from "core/log";

/** One row of a help section: what to type, and what it does. */
export type Row = readonly [label: string, text: string];

const INDENT = "  ";
const GAP = "  ";
// Fewer columns than this beside the labels and a description reads a few
// words a line, so it goes under its label instead, with the width to itself.
const MIN_BESIDE = 30;
// how much further in than its label a description under it starts
const UNDER = "    ";

/**
 * Lays out a help section: each label in a column of its own, its text beside
 * it. On a terminal `width` columns wide, text wraps back to its own column
 * rather than to the left edge, and once any row wraps a blank line parts
 * every row from the next, so where one ends is plain. Without a width, as
 * when piped, each row stays one line, so grep finds it whole.
 */
export function table(
	rows: readonly Row[],
	style: (label: string) => string,
	width: number | undefined,
): string[] {
	const pad = Math.max(0, ...rows.map(([label]) => label.length));
	const column = INDENT.length + pad + GAP.length;
	const beside = width === undefined || width - column >= MIN_BESIDE;
	const laid = rows.map(([label, text]): string[] => {
		if (!text) {
			return [`${INDENT}${style(label)}`];
		}
		if (beside) {
			// padded before it is coloured: the trailing spaces land inside the
			// escape sequence, where they are invisible, so the column lines up
			const [first, ...rest] = wrap(text, width && width - column);
			return [
				`${INDENT}${style(label.padEnd(pad))}${GAP}${first}`,
				...rest.map((line) => `${" ".repeat(column)}${line}`),
			];
		}
		const indent = `${INDENT}${UNDER}`;
		return [
			`${INDENT}${style(label)}`,
			...wrap(text, width && width - indent.length).map(
				(line) => `${indent}${line}`,
			),
		];
	});
	const parted = laid.some((lines) => lines.length > 1);
	return laid.flatMap((lines, i) => (parted && i > 0 ? ["", ...lines] : lines));
}

/**
 * Breaks text at spaces into lines at most `width` columns wide, counting
 * only what shows, not colour codes; a word wider than that gets a line to
 * itself. Its own line breaks stay. Without a width it is left whole.
 */
export function wrap(text: string, width: number | undefined): string[] {
	if (width === undefined) {
		return text.split("\n");
	}
	const lines: string[] = [];
	for (const paragraph of text.split("\n")) {
		let line: string[] = [];
		let length = 0;
		for (const word of paragraph.split(" ")) {
			const size = color.strip(word).length;
			if (line.length > 0 && length + 1 + size > width) {
				lines.push(line.join(" "));
				line = [];
				length = 0;
			}
			length += (line.length > 0 ? 1 : 0) + size;
			line.push(word);
		}
		lines.push(line.join(" "));
	}
	return lines;
}

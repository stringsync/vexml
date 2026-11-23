/** A single token from a JS/TS source file, with original byte offsets. */
export interface Token {
	kind: 'ident' | 'string' | 'punct' | 'other';
	value: string;
	start: number;
	end: number;
}

/** Lightweight JS/TS tokenizer that skips comments and respects strings, templates, and regexes. */
export function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	const n = source.length;
	// Stack of brace depths for `${...}` interpolations inside template literals.
	const templateBraces: number[] = [];

	while (i < n) {
		const ch = source[i] ?? '';

		if (/\s/.test(ch)) {
			i++;
			continue;
		}

		if (ch === '/' && source[i + 1] === '/') {
			i += 2;
			while (i < n && source[i] !== '\n') {
				i++;
			}
			continue;
		}

		if (ch === '/' && source[i + 1] === '*') {
			i += 2;
			while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
				i++;
			}
			i += 2;
			continue;
		}

		if (ch === "'" || ch === '"') {
			const start = i;
			const quote = ch;
			i++;
			let value = '';
			while (i < n && source[i] !== quote) {
				if (source[i] === '\\' && i + 1 < n) {
					value += source[i + 1] ?? '';
					i += 2;
				} else {
					value += source[i] ?? '';
					i++;
				}
			}
			i++;
			tokens.push({ kind: 'string', value, start, end: i });
			continue;
		}

		if (ch === '`') {
			const start = i;
			i++;
			const res = scanTemplateChunk(source, i);
			i = res.next;
			if (res.interpolation) {
				templateBraces.push(0);
				tokens.push({ kind: 'other', value: res.value, start, end: i });
			} else {
				tokens.push({ kind: 'string', value: res.value, start, end: i });
			}
			continue;
		}

		if (ch === '}' && templateBraces.length > 0) {
			const top = templateBraces[templateBraces.length - 1] ?? 0;
			if (top === 0) {
				templateBraces.pop();
				const start = i;
				i++;
				const res = scanTemplateChunk(source, i);
				i = res.next;
				if (res.interpolation) {
					templateBraces.push(0);
				}
				tokens.push({ kind: 'other', value: res.value, start, end: i });
				continue;
			}
			templateBraces[templateBraces.length - 1] = top - 1;
			tokens.push({ kind: 'punct', value: '}', start: i, end: i + 1 });
			i++;
			continue;
		}

		if (ch === '{' && templateBraces.length > 0) {
			const top = templateBraces[templateBraces.length - 1] ?? 0;
			templateBraces[templateBraces.length - 1] = top + 1;
			tokens.push({ kind: 'punct', value: '{', start: i, end: i + 1 });
			i++;
			continue;
		}

		if (ch === '/' && canStartRegex(tokens[tokens.length - 1])) {
			const start = i;
			i++;
			let inClass = false;
			while (i < n) {
				const c = source[i];
				if (c === '\\') {
					i += 2;
					continue;
				}
				if (c === '[') {
					inClass = true;
				} else if (c === ']') {
					inClass = false;
				} else if (c === '/' && !inClass) {
					i++;
					while (i < n && /[a-z]/i.test(source[i] ?? '')) {
						i++;
					}
					break;
				}
				i++;
			}
			tokens.push({
				kind: 'other',
				value: source.slice(start, i),
				start,
				end: i,
			});
			continue;
		}

		if (/[A-Za-z_$]/.test(ch)) {
			const start = i;
			i++;
			while (i < n && /[A-Za-z0-9_$]/.test(source[i] ?? '')) {
				i++;
			}
			tokens.push({
				kind: 'ident',
				value: source.slice(start, i),
				start,
				end: i,
			});
			continue;
		}

		if (/[0-9]/.test(ch)) {
			const start = i;
			i++;
			while (i < n && /[0-9a-zA-Z_.]/.test(source[i] ?? '')) {
				i++;
			}
			tokens.push({
				kind: 'other',
				value: source.slice(start, i),
				start,
				end: i,
			});
			continue;
		}

		if ('(){}[];.,:'.includes(ch)) {
			tokens.push({ kind: 'punct', value: ch, start: i, end: i + 1 });
			i++;
			continue;
		}

		tokens.push({ kind: 'other', value: ch, start: i, end: i + 1 });
		i++;
	}

	return tokens;
}

/** Finds the matching closing punctuation token for `openIndex`, or -1 if unbalanced. */
export function findMatchingClose(
	tokens: Token[],
	openIndex: number,
	openChar: string,
	closeChar: string,
): number {
	let depth = 0;
	for (let i = openIndex; i < tokens.length; i++) {
		const tok = tokens[i];
		if (tok?.kind !== 'punct') {
			continue;
		}
		if (tok.value === openChar) {
			depth++;
		} else if (tok.value === closeChar) {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}
	return -1;
}

/** Finds the first `target` punctuation token at nesting depth 0 starting at `from`. */
export function findNextAtDepthZero(
	tokens: Token[],
	from: number,
	target: string,
): number {
	let depth = 0;
	for (let i = from; i < tokens.length; i++) {
		const tok = tokens[i];
		if (!tok) {
			break;
		}
		if (depth === 0 && tok.kind === 'punct' && tok.value === target) {
			return i;
		}
		depth += depthDelta(tok);
	}
	return -1;
}

/** Nesting depth change for opening (`+1`) and closing (`-1`) brackets, parens, and braces. */
export function depthDelta(tok: Token): number {
	if (tok.kind !== 'punct') {
		return 0;
	}
	if (tok.value === '{' || tok.value === '(' || tok.value === '[') {
		return 1;
	}
	if (tok.value === '}' || tok.value === ')' || tok.value === ']') {
		return -1;
	}
	return 0;
}

function scanTemplateChunk(
	source: string,
	from: number,
): { value: string; next: number; interpolation: boolean } {
	let i = from;
	const n = source.length;
	let value = '';
	while (i < n) {
		const c = source[i];
		if (c === '\\' && i + 1 < n) {
			value += source[i + 1] ?? '';
			i += 2;
			continue;
		}
		if (c === '`') {
			return { value, next: i + 1, interpolation: false };
		}
		if (c === '$' && source[i + 1] === '{') {
			return { value, next: i + 2, interpolation: true };
		}
		value += c ?? '';
		i++;
	}
	return { value, next: i, interpolation: false };
}

function canStartRegex(prev: Token | undefined): boolean {
	if (!prev) {
		return true;
	}
	if (prev.kind === 'ident') {
		return REGEX_PRECEDING_KEYWORDS.has(prev.value);
	}
	if (prev.kind === 'punct') {
		return prev.value !== ')' && prev.value !== ']';
	}
	return prev.kind !== 'string' && !/^[0-9]/.test(prev.value);
}

const REGEX_PRECEDING_KEYWORDS = new Set([
	'return',
	'case',
	'throw',
	'in',
	'of',
	'typeof',
	'void',
	'delete',
	'new',
	'await',
]);

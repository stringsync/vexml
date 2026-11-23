import {
	depthDelta,
	findMatchingClose,
	findNextAtDepthZero,
	type Token,
	tokenize,
} from './js-tokens';

/** A rule's scoped check source, check state, and referenced fixtures from a test file. */
export interface RuleCheckSlice {
	/** Canonical source holding only this rule's check block(s) and transitively called local declarations. */
	source: string;
	/** Whether the rule's check is active (`it`/`it.concurrent`) or still `it.todo`. */
	state: 'active' | 'todo';
	/** Fixture stems passed as string literals to `engrave(...)` or `draw(...)` in this rule's slice. */
	fixtures: string[];
}

/**
 * Extracts a single rule's measurement check slice from an engraving test file: the rule's
 * own `it`/`test` block(s) (or non-screenshot `it` blocks inside a single-rule `describe`),
 * plus any file-local declarations transitively referenced by those blocks.
 *
 * Returns null when the file holds no measurement check for `ruleId` (e.g. a rule that is
 * judged by eye against a shared screenshot).
 */
export function sliceRuleCheck(
	source: string,
	ruleId: string,
): RuleCheckSlice | null {
	const tokens = tokenize(source);
	const calls = findTestCalls(tokens);
	const rootCalls = selectRuleCalls(calls, tokens, ruleId);
	if (rootCalls.length === 0) {
		return null;
	}

	const decls = findTopLevelDecls(tokens, source);
	const declsByName = new Map<string, TopDecl[]>();
	for (const decl of decls) {
		const list = declsByName.get(decl.name) ?? [];
		list.push(decl);
		declsByName.set(decl.name, list);
	}

	const includedDecls = new Set<TopDecl>();
	const queue: string[] = [];
	for (const call of rootCalls) {
		queue.push(
			...collectReferencedIdents(tokens, call.tokenStart, call.tokenEnd),
		);
	}
	const seenNames = new Set<string>();
	while (queue.length > 0) {
		const name = queue.shift();
		if (!name || seenNames.has(name)) {
			continue;
		}
		seenNames.add(name);
		const matches = declsByName.get(name);
		if (!matches) {
			continue;
		}
		for (const decl of matches) {
			if (includedDecls.has(decl)) {
				continue;
			}
			includedDecls.add(decl);
			queue.push(
				...collectReferencedIdents(tokens, decl.tokenStart, decl.tokenEnd),
			);
		}
	}

	const orderedDecls = [...includedDecls].sort((a, b) => a.start - b.start);
	const parts = [
		...rootCalls.map((c) => source.slice(c.start, c.end).trim()),
		...orderedDecls.map((d) => source.slice(d.start, d.end).trim()),
	];

	const fixtures = new Set<string>();
	for (const call of rootCalls) {
		for (const name of extractFixtureCalls(
			tokens,
			call.tokenStart,
			call.tokenEnd,
		)) {
			fixtures.add(name);
		}
	}
	for (const decl of orderedDecls) {
		for (const name of extractFixtureCalls(
			tokens,
			decl.tokenStart,
			decl.tokenEnd,
		)) {
			fixtures.add(name);
		}
	}

	const state = rootCalls.some((c) => c.modifier === 'todo')
		? 'todo'
		: 'active';
	return {
		source: parts.join('\n\n'),
		state,
		fixtures: [...fixtures],
	};
}

/** Extracts every string literal fixture stem passed to `draw('...')` in a test file. */
export function extractDrawFixtures(source: string): string[] {
	const tokens = tokenize(source);
	const found = new Set<string>();
	for (let i = 0; i < tokens.length - 2; i++) {
		const cur = tokens[i];
		const next = tokens[i + 1];
		const arg = tokens[i + 2];
		if (
			cur?.kind === 'ident' &&
			cur.value === 'draw' &&
			next?.kind === 'punct' &&
			next.value === '(' &&
			arg?.kind === 'string'
		) {
			found.add(arg.value);
		}
	}
	return [...found];
}

interface CallBlock {
	callee: 'it' | 'test' | 'describe';
	modifier: string | null;
	title: string;
	start: number;
	end: number;
	tokenStart: number;
	tokenEnd: number;
}

interface TopDecl {
	name: string;
	start: number;
	end: number;
	tokenStart: number;
	tokenEnd: number;
}

const TOP_LEVEL_STARTERS = new Set([
	'import',
	'export',
	'function',
	'async',
	'const',
	'let',
	'var',
	'class',
	'type',
	'interface',
	'describe',
	'it',
	'test',
]);

function selectRuleCalls(
	calls: CallBlock[],
	tokens: Token[],
	ruleId: string,
): CallBlock[] {
	// Multi-rule files name each `it`/`test` block with its rule id.
	const direct = calls.filter(
		(c) => c.callee !== 'describe' && matchesRuleTitle(c.title, ruleId),
	);
	if (direct.length > 0) {
		return direct;
	}

	// Single-rule files name the enclosing `describe` with the rule id.
	const matchingDescribes = calls.filter(
		(c) => c.callee === 'describe' && matchesRuleTitle(c.title, ruleId),
	);
	const nested: CallBlock[] = [];
	for (const desc of matchingDescribes) {
		const inside = calls.filter(
			(c) =>
				c.callee !== 'describe' &&
				c.start > desc.start &&
				c.end <= desc.end &&
				!isScreenshotOnly(tokens, c.tokenStart, c.tokenEnd),
		);
		nested.push(...inside);
	}
	return nested;
}

/**
 * Matches a test title against a kebab-case rule id at a non-slug boundary so `stem` never
 * matches `stem-length`.
 */
function matchesRuleTitle(title: string, ruleId: string): boolean {
	if (!title.startsWith(ruleId)) {
		return false;
	}
	const next = title[ruleId.length];
	return next === undefined || !/[a-z0-9-]/i.test(next);
}

/** True when a test block asserts only `toMatchScreenshot` and no measurement assertions. */
function isScreenshotOnly(
	tokens: Token[],
	start: number,
	end: number,
): boolean {
	let expects = 0;
	let screenshots = 0;
	for (let i = start; i < end; i++) {
		const tok = tokens[i];
		if (tok?.kind !== 'ident') {
			continue;
		}
		if (tok.value === 'expect' && tokens[i + 1]?.value === '(') {
			expects++;
		} else if (tok.value === 'toMatchScreenshot') {
			screenshots++;
		}
	}
	return screenshots > 0 && expects <= screenshots;
}

function findTestCalls(tokens: Token[]): CallBlock[] {
	const calls: CallBlock[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const tok = tokens[i];
		if (
			tok?.kind !== 'ident' ||
			(tok.value !== 'it' && tok.value !== 'test' && tok.value !== 'describe')
		) {
			continue;
		}
		// Skip property accesses like `obj.test(...)`.
		const prev = tokens[i - 1];
		if (prev?.kind === 'punct' && prev.value === '.') {
			continue;
		}

		let cursor = i + 1;
		let modifier: string | null = null;
		if (
			tokens[cursor]?.kind === 'punct' &&
			tokens[cursor]?.value === '.' &&
			tokens[cursor + 1]?.kind === 'ident'
		) {
			const mod = tokens[cursor + 1]?.value ?? '';
			if (
				mod === 'concurrent' ||
				mod === 'todo' ||
				mod === 'skip' ||
				mod === 'only'
			) {
				modifier = mod;
				cursor += 2;
			}
		}

		if (tokens[cursor]?.kind !== 'punct' || tokens[cursor]?.value !== '(') {
			continue;
		}
		const titleTok = tokens[cursor + 1];
		if (titleTok?.kind !== 'string') {
			continue;
		}
		const closeIdx = findMatchingClose(tokens, cursor, '(', ')');
		if (closeIdx < 0) {
			continue;
		}
		const endTok =
			tokens[closeIdx + 1]?.kind === 'punct' &&
			tokens[closeIdx + 1]?.value === ';'
				? closeIdx + 1
				: closeIdx;
		calls.push({
			callee: tok.value,
			modifier,
			title: titleTok.value,
			start: tok.start,
			end: tokens[endTok]?.end ?? tok.end,
			tokenStart: i,
			tokenEnd: endTok + 1,
		});
	}
	return calls;
}

function findTopLevelDecls(tokens: Token[], source: string): TopDecl[] {
	const decls: TopDecl[] = [];
	let depth = 0;
	let i = 0;
	while (i < tokens.length) {
		const tok = tokens[i];
		if (!tok) {
			break;
		}
		if (depth > 0) {
			depth += depthDelta(tok);
			i++;
			continue;
		}

		const stmtStart = i;
		let cursor = i;
		if (tok.kind === 'ident' && tok.value === 'export') {
			cursor++;
		}
		if (tokens[cursor]?.kind === 'ident' && tokens[cursor]?.value === 'async') {
			cursor++;
		}
		const kw = tokens[cursor];
		if (
			kw?.kind === 'ident' &&
			(kw.value === 'function' || kw.value === 'class')
		) {
			const nameTok = tokens[cursor + 1];
			if (nameTok?.kind === 'ident') {
				const openBrace = findNextAtDepthZero(tokens, cursor + 2, '{');
				const closeBrace =
					openBrace >= 0 ? findMatchingClose(tokens, openBrace, '{', '}') : -1;
				if (closeBrace >= 0) {
					decls.push({
						name: nameTok.value,
						start: tokens[stmtStart]?.start ?? kw.start,
						end: tokens[closeBrace]?.end ?? kw.end,
						tokenStart: stmtStart,
						tokenEnd: closeBrace + 1,
					});
					i = closeBrace + 1;
					continue;
				}
			}
		} else if (
			kw?.kind === 'ident' &&
			(kw.value === 'const' ||
				kw.value === 'let' ||
				kw.value === 'var' ||
				kw.value === 'type' ||
				kw.value === 'interface')
		) {
			const nameTok = tokens[cursor + 1];
			if (nameTok?.kind === 'ident') {
				const endIdx = findStatementEnd(tokens, source, cursor + 2, kw.value);
				decls.push({
					name: nameTok.value,
					start: tokens[stmtStart]?.start ?? kw.start,
					end: tokens[endIdx]?.end ?? kw.end,
					tokenStart: stmtStart,
					tokenEnd: endIdx + 1,
				});
				i = endIdx + 1;
				continue;
			}
		}

		depth += depthDelta(tok);
		i++;
	}
	return decls;
}

function findStatementEnd(
	tokens: Token[],
	source: string,
	from: number,
	keyword: string,
): number {
	if (keyword === 'interface') {
		const open = findNextAtDepthZero(tokens, from, '{');
		const close = open >= 0 ? findMatchingClose(tokens, open, '{', '}') : -1;
		return close >= 0 ? close : tokens.length - 1;
	}
	let depth = 0;
	for (let i = from; i < tokens.length; i++) {
		const tok = tokens[i];
		if (!tok) {
			break;
		}
		if (depth === 0 && tok.kind === 'punct' && tok.value === ';') {
			return i;
		}
		const prevDepth = depth;
		depth += depthDelta(tok);
		// Semicolonless arrow/block const followed by a new top-level statement.
		if (
			prevDepth > 0 &&
			depth === 0 &&
			tok.kind === 'punct' &&
			tok.value === '}'
		) {
			const next = tokens[i + 1];
			if (!next) {
				return i;
			}
			if (next.kind === 'punct' && next.value === ';') {
				return i + 1;
			}
			if (
				source.slice(tok.end, next.start).includes('\n') &&
				next.kind === 'ident' &&
				TOP_LEVEL_STARTERS.has(next.value)
			) {
				return i;
			}
		}
	}
	return tokens.length - 1;
}

function collectReferencedIdents(
	tokens: Token[],
	start: number,
	end: number,
): string[] {
	const refs: string[] = [];
	for (let i = start; i < end; i++) {
		const tok = tokens[i];
		if (tok?.kind !== 'ident') {
			continue;
		}
		const prev = tokens[i - 1];
		if (prev?.kind === 'punct' && prev.value === '.') {
			continue;
		}
		refs.push(tok.value);
	}
	return refs;
}

function extractFixtureCalls(
	tokens: Token[],
	start: number,
	end: number,
): string[] {
	const found: string[] = [];
	for (let i = start; i < end - 2; i++) {
		const cur = tokens[i];
		const next = tokens[i + 1];
		const arg = tokens[i + 2];
		if (
			cur?.kind === 'ident' &&
			(cur.value === 'engrave' || cur.value === 'draw') &&
			next?.kind === 'punct' &&
			next.value === '(' &&
			arg?.kind === 'string'
		) {
			found.push(arg.value);
		}
	}
	return found;
}

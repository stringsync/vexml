/** Where a Behind Bars rule's note goes, as `<rule-id>.md`, for reviews and `vex rules strip` to read beside its screenshot. */
export const RULE_NOTES_DIR = 'packages/integration/rules';

/** The heading a rule note uses to record agreement across Behind Bars, MuseScore, Verovio, and OSMD. */
export const RENDERERS_HEADING = '### Renderers';

/** The four renderers compared during an extract. */
export const COMPARISON_RENDERERS = [
	'behind-bars',
	'musescore',
	'verovio',
	'osmd',
] as const;

export type ComparisonRendererId = (typeof COMPARISON_RENDERERS)[number];

/** Whether a renderer matches the rule, differs from it, or could not render the fixture. */
export type RendererStance = 'agrees' | 'differs' | 'unavailable';

/** One renderer's recorded observation under `### Renderers`. */
export interface RendererObservation {
	renderer: ComparisonRendererId;
	stance: RendererStance;
	detail: string | null;
}

/** Parsed renderer agreement across Behind Bars, MuseScore, Verovio, and OSMD. */
export interface RendererAgreement {
	/**
	 * `unanimous` when at least two renderers are available and none differ;
	 * `consensus` when Behind Bars agrees alongside MuseScore or at least two digital renderers;
	 * `disagree` otherwise.
	 */
	status: 'unanimous' | 'consensus' | 'disagree';
	observations: RendererObservation[];
	/** True when two or more digital renderers differ from Behind Bars. */
	highVariability: boolean;
	/** Short explanation of any differing renderers, or null when unanimous. */
	summary: string | null;
}

/**
 * Parses a rule note's `### Renderers` section. Returns null when the section is absent or
 * empty; throws when an unknown renderer is listed or a line cannot be parsed.
 */
export function parseRendererAgreement(note: string): RendererAgreement | null {
	const lines = note.split('\n');
	const start = lines.findIndex((line) => line.trim() === RENDERERS_HEADING);
	if (start === -1) {
		return null;
	}
	const observations: RendererObservation[] = [];
	const seen = new Set<ComparisonRendererId>();
	for (const raw of lines.slice(start + 1)) {
		if (/^#{1,3} /.test(raw)) {
			break;
		}
		const trimmed = raw.trim();
		if (!trimmed) {
			continue;
		}
		const line = trimmed.replace(/^[-*]\s+/, '');
		const match = /^([^:]+):\s*(.+)$/.exec(line);
		if (!match?.[1] || !match[2]) {
			throw new Error(
				`renderers: cannot read ${JSON.stringify(trimmed)} (expected "- <Renderer>: agrees|differs|unavailable, <note>")`,
			);
		}
		const rawName = match[1].trim().toLowerCase();
		const renderer = RENDERER_ALIASES[rawName];
		if (!renderer) {
			throw new Error(
				`renderers: unknown renderer ${JSON.stringify(match[1].trim())} (expected Behind Bars, MuseScore, Verovio, or OSMD)`,
			);
		}
		if (seen.has(renderer)) {
			throw new Error(
				`renderers: duplicate entry for ${RENDERER_LABELS[renderer]}`,
			);
		}
		seen.add(renderer);
		const { stance, detail } = parseStance(match[2].trim(), match[1].trim());
		observations.push({ renderer, stance, detail });
	}
	if (observations.length === 0) {
		return null;
	}
	const available = observations.filter((obs) => obs.stance !== 'unavailable');
	const differing = available.filter((obs) => obs.stance === 'differs');
	const digital = observations.filter((obs) => obs.renderer !== 'behind-bars');
	const digitalAgreeing = digital.filter((obs) => obs.stance === 'agrees');
	const digitalDiffering = digital.filter((obs) => obs.stance === 'differs');
	const book = observations.find((obs) => obs.renderer === 'behind-bars');
	const musescore = observations.find((obs) => obs.renderer === 'musescore');
	const highVariability = digitalDiffering.length >= 2;

	if (available.length >= 2 && differing.length === 0) {
		return {
			status: 'unanimous',
			observations,
			highVariability: false,
			summary: null,
		};
	}

	let summary: string;
	if (differing.length > 0) {
		summary = differing
			.map((obs) => {
				const label = RENDERER_LABELS[obs.renderer];
				return obs.detail
					? `${label} differs (${obs.detail})`
					: `${label} differs`;
			})
			.join('; ');
	} else if (available.length === 1 && available[0]) {
		summary = `only ${RENDERER_LABELS[available[0].renderer]} available`;
	} else {
		summary = 'no renderers available';
	}

	if (
		book?.stance === 'agrees' &&
		(musescore?.stance === 'agrees' || digitalAgreeing.length >= 2)
	) {
		return {
			status: 'consensus',
			observations,
			highVariability,
			summary,
		};
	}

	return {
		status: 'disagree',
		observations,
		highVariability,
		summary,
	};
}

const RENDERER_LABELS: Record<ComparisonRendererId, string> = {
	'behind-bars': 'Behind Bars',
	musescore: 'MuseScore',
	verovio: 'Verovio',
	osmd: 'OSMD',
};

const RENDERER_ALIASES: Record<string, ComparisonRendererId> = {
	'behind bars': 'behind-bars',
	'behind-bars': 'behind-bars',
	book: 'behind-bars',
	gould: 'behind-bars',
	musescore: 'musescore',
	'musescore 4': 'musescore',
	mscore: 'musescore',
	verovio: 'verovio',
	osmd: 'osmd',
};

function parseStance(
	raw: string,
	rendererLabel: string,
): { stance: RendererStance; detail: string | null } {
	const token =
		/^(agrees?|matches?|yes|differs?|disagrees?|no|unavailable|n\/a|na|missing|none)\b(.*)$/i.exec(
			raw,
		);
	if (!token?.[1]) {
		throw new Error(
			`renderers: cannot read stance for ${rendererLabel} from ${JSON.stringify(raw)} (start with agrees, differs, or unavailable)`,
		);
	}
	const keyword = token[1].toLowerCase();
	let stance: RendererStance;
	if (
		keyword === 'agree' ||
		keyword === 'agrees' ||
		keyword === 'match' ||
		keyword === 'matches' ||
		keyword === 'yes'
	) {
		stance = 'agrees';
	} else if (
		keyword === 'differ' ||
		keyword === 'differs' ||
		keyword === 'disagree' ||
		keyword === 'disagrees' ||
		keyword === 'no'
	) {
		stance = 'differs';
	} else {
		stance = 'unavailable';
	}
	const rest = (token[2] ?? '').replace(/^[\s:\u2014\u2013,-]+/, '').trim();
	const detail = rest.length > 0 ? rest : null;
	return { stance, detail };
}

export { LEDGER_FILE } from './rule-ledger';

/** The screenshot a rule's check records, which its note explains. */
export function ruleSnapshot(id: string): string {
	return `engraving_${id}.png`;
}

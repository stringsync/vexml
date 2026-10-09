import { type Config, DEFAULT_FONT_CONFIG, type Layout } from './config';

/* The part of a resolved Config that shapes what a snapshot holds: everything the engraving,
 * the element geometry or the timeline depends on, in a fixed key order so two compare as JSON.
 * What only sizes or places the stage (width, height, their caps, the scroll container) and the
 * pixel ratio are left out: a snapshot engraves at its reference width and replays at any. */
export type SnapshotConfig = {
	layout: Layout;
	noteSpacing: number;
	softmaxFactor: number;
	systemSpacing: number;
	showPartLabels: boolean;
	measureNumbering: Config['measureNumbering'];
	showTabSlideText: boolean;
	tabStemPlacement: Config['tabStemPlacement'];
	showTabs: boolean;
	showNotation: boolean;
	minLastSystemFill: number;
	stretchSingleSystem: boolean;
	maxSystemFill: number;
	fonts: { notation: SnapshotFont; text: SnapshotFont };
	backgroundColor: string | null;
	gaps: SnapshotGap[];
};

type SnapshotFont = {
	family: string;
	url: string | null;
	color: string | null;
};

/* A gap as placed: a document gap names its measure by index. */
type SnapshotGap = {
	beforeMeasureIndex: number | null;
	beforeBarIndex: number | null;
	measureIndex: number | null;
	durationMs: number;
	label: string | null;
	minWidth: number | null;
	style: {
		fontFamily: string | null;
		fontSize: number | null;
		fontColor: string | null;
		fill: string | null;
		border: string | null;
	} | null;
};

export function snapshotConfig(config: Config): SnapshotConfig {
	const font = (
		override: Config['fonts']['notation'],
		family: string,
	): SnapshotFont => ({
		family: override?.family ?? family,
		url: override?.url ?? null,
		color: override?.color ?? null,
	});
	return {
		layout: layoutOf(config.layout),
		noteSpacing: config.noteSpacing,
		softmaxFactor: config.softmaxFactor,
		systemSpacing: config.systemSpacing,
		showPartLabels: config.showPartLabels,
		measureNumbering: config.measureNumbering,
		showTabSlideText: config.showTabSlideText,
		tabStemPlacement: config.tabStemPlacement,
		showTabs: config.showTabs,
		showNotation: config.showNotation,
		minLastSystemFill: config.minLastSystemFill,
		stretchSingleSystem: config.stretchSingleSystem,
		maxSystemFill: config.maxSystemFill,
		fonts: {
			notation: font(
				config.fonts.notation,
				DEFAULT_FONT_CONFIG.notation.family,
			),
			text: font(config.fonts.text, DEFAULT_FONT_CONFIG.text.family),
		},
		backgroundColor: config.backgroundColor,
		gaps: config.gaps.map((gap) => ({
			beforeMeasureIndex: gap.beforeMeasureIndex ?? null,
			beforeBarIndex: gap.beforeBarIndex ?? null,
			measureIndex: gap.measure?.index ?? null,
			durationMs: gap.durationMs,
			label: gap.label ?? null,
			minWidth: gap.minWidth ?? null,
			style: gap.style
				? {
						fontFamily: gap.style.fontFamily ?? null,
						fontSize: gap.style.fontSize ?? null,
						fontColor: gap.style.fontColor ?? null,
						fill: gap.style.fill ?? null,
						border: gap.style.border ?? null,
					}
				: null,
		})),
	};
}

/* The layout's own knobs in a fixed order, whatever order the caller wrote them in. */
function layoutOf(layout: Layout): Layout {
	switch (layout.type) {
		case 'standard':
			return {
				type: layout.type,
				referenceWidth: layout.referenceWidth,
				honorSystemBreaks: layout.honorSystemBreaks,
				overflow: layout.overflow,
			};
		case 'panoramic':
			return {
				type: layout.type,
				stickySignatures: layout.stickySignatures,
				scale: layout.scale,
				fitHeight: layout.fitHeight,
			};
		case 'paged':
			return {
				type: layout.type,
				pageWidth: layout.pageWidth,
				pageHeight: layout.pageHeight,
				margin: layout.margin,
				honorSystemBreaks: layout.honorSystemBreaks,
				overflow: layout.overflow,
			};
	}
}

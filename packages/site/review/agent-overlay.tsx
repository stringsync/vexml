import type { AgentMark, Point } from '@vexml/vex/review-data';

const COLORS = {
	pass: '#15803d',
	fail: '#dc2626',
	reference: '#2563eb',
	halo: 'rgba(255, 255, 255, 0.92)',
} as const;

/** SVG layer rendering an engraving check's measurement and reference marks over a snapshot. */
export function AgentOverlaySvg({
	marks,
	width,
	height,
	hovered,
}: {
	marks: AgentMark[];
	width: number;
	height: number;
	hovered: number | null;
}) {
	// Reference lines sit under passing measurements, with failing measurements on top.
	// `pointerEvents="none"` keeps drag-to-draw unobstructed anywhere on the score.
	const ordered = marks
		.map((mark, index) => ({ mark, index }))
		.sort((a, b) => rank(a.mark) - rank(b.mark));

	return (
		<g pointerEvents="none" aria-label="agent marks">
			{ordered.map(({ mark, index }) => (
				<AgentMarkShape
					key={index}
					mark={mark}
					width={width}
					height={height}
					active={hovered === index}
				/>
			))}
		</g>
	);
}

function rank(mark: AgentMark): number {
	if (mark.role === 'reference') {
		return 0;
	}
	return mark.pass === false ? 2 : 1;
}

function colorOf(mark: AgentMark): string {
	if (mark.role === 'reference') {
		return COLORS.reference;
	}
	return mark.pass === false ? COLORS.fail : COLORS.pass;
}

function AgentMarkShape({
	mark,
	width,
	height,
	active,
}: {
	mark: AgentMark;
	width: number;
	height: number;
	active: boolean;
}) {
	const color = colorOf(mark);
	const failed = mark.role === 'measure' && mark.pass === false;

	if (mark.kind === 'line') {
		return (
			<LineShape
				mark={mark}
				color={color}
				width={width}
				height={height}
				active={active}
			/>
		);
	}
	if (mark.kind === 'bracket') {
		return (
			<BracketShape
				mark={mark}
				color={color}
				failed={failed}
				width={width}
				height={height}
				active={active}
			/>
		);
	}
	return (
		<BoxShape
			mark={mark}
			color={color}
			failed={failed}
			width={width}
			height={height}
			active={active}
		/>
	);
}

function LineShape({
	mark,
	color,
	width,
	height,
	active,
}: {
	mark: AgentMark;
	color: string;
	width: number;
	height: number;
	active: boolean;
}) {
	const isRef = mark.role === 'reference';
	const horizontal = Math.abs(mark.to.y - mark.from.y) < 0.5;
	const y1 = horizontal ? Math.round(mark.from.y) + 0.5 : mark.from.y;
	const y2 = horizontal ? y1 : mark.to.y;
	const sw = (isRef ? 1.1 : 1.6) + (active ? 0.9 : 0);

	const labelX =
		isRef && horizontal
			? Math.min(width - 6, Math.max(mark.from.x, mark.to.x) - 8)
			: clamp((mark.from.x + mark.to.x) / 2, 20, width - 20);
	const labelY =
		isRef && horizontal
			? Math.min(height - 4, y1 + 11)
			: Math.max(13, Math.min(mark.from.y, mark.to.y) - 4);

	return (
		<g opacity={isRef && !active ? 0.72 : 1}>
			<line
				x1={mark.from.x}
				y1={y1}
				x2={mark.to.x}
				y2={y2}
				stroke={color}
				strokeWidth={sw}
				strokeDasharray={isRef ? '4 3' : undefined}
			/>
			{mark.label && (
				<text
					x={labelX}
					y={labelY}
					textAnchor={isRef && horizontal ? 'end' : 'middle'}
					fontFamily="system-ui, sans-serif"
					fontSize={isRef ? 9.5 : 11}
					fontWeight={isRef ? 500 : 600}
					fill={color}
					stroke={COLORS.halo}
					strokeWidth={3}
					paintOrder="stroke"
				>
					{mark.label}
				</text>
			)}
		</g>
	);
}

function BracketShape({
	mark,
	color,
	failed,
	width,
	height,
	active,
}: {
	mark: AgentMark;
	color: string;
	failed: boolean;
	width: number;
	height: number;
	active: boolean;
}) {
	const dx = mark.to.x - mark.from.x;
	const dy = mark.to.y - mark.from.y;
	const len = Math.hypot(dx, dy);
	const vertical = Math.abs(dy) >= Math.abs(dx);
	const fx = vertical ? Math.round(mark.from.x) + 0.5 : mark.from.x;
	const tx = vertical ? fx : mark.to.x;
	const fy = vertical ? mark.from.y : Math.round(mark.from.y) + 0.5;
	const ty = vertical ? mark.to.y : fy;
	const sw = (failed ? 2 : 1.45) + (active ? 0.8 : 0);
	const cap = failed || active ? 4.5 : 3.5;

	const px = len > 0 ? (-dy / len) * cap : 0;
	const py = len > 0 ? (dx / len) * cap : 0;

	const down = dy >= 0;
	const lx = vertical
		? clamp(tx, 16, width - 16)
		: clamp((fx + tx) / 2, 16, width - 16);
	let ly = Math.max(12, Math.min(fy, ty) - 6);
	if (vertical) {
		ly = down ? Math.min(height - 5, ty + 13) : Math.max(12, ty - 6);
	}

	const highlightRect =
		failed || active
			? {
					x: Math.min(fx, tx) - 9,
					y: Math.min(fy, ty) - 4,
					w: Math.abs(tx - fx) + 18,
					h: Math.abs(ty - fy) + 8,
				}
			: null;

	return (
		<g>
			{highlightRect && (
				<rect
					x={highlightRect.x}
					y={highlightRect.y}
					width={highlightRect.w}
					height={highlightRect.h}
					rx={4}
					fill={failed ? 'rgba(220, 38, 38, 0.12)' : 'rgba(21, 128, 61, 0.1)'}
				/>
			)}
			<line
				x1={fx}
				y1={fy}
				x2={tx}
				y2={ty}
				stroke="white"
				strokeWidth={sw + 2}
				opacity={0.85}
			/>
			<line x1={fx} y1={fy} x2={tx} y2={ty} stroke={color} strokeWidth={sw} />
			{len > 0 && (
				<>
					<line
						x1={fx - px}
						y1={fy - py}
						x2={fx + px}
						y2={fy + py}
						stroke={color}
						strokeWidth={sw}
					/>
					<line
						x1={tx - px}
						y1={ty - py}
						x2={tx + px}
						y2={ty + py}
						stroke={color}
						strokeWidth={sw}
					/>
				</>
			)}
			{mark.label &&
				(failed ? (
					<g>
						<rect
							x={lx - Math.max(12, mark.label.length * 4 + 7)}
							y={ly - 10.5}
							width={Math.max(24, mark.label.length * 8 + 14)}
							height={14}
							rx={7}
							fill={color}
							stroke="white"
							strokeWidth={1.5}
						/>
						<text
							x={lx}
							y={ly - 0.5}
							textAnchor="middle"
							fontFamily="system-ui, sans-serif"
							fontSize={9.5}
							fontWeight={700}
							fill="white"
						>
							{mark.label}
						</text>
					</g>
				) : (
					<text
						x={lx}
						y={ly}
						textAnchor="middle"
						fontFamily="system-ui, sans-serif"
						fontSize={11}
						fontWeight={active ? 700 : 600}
						fill={color}
						stroke={COLORS.halo}
						strokeWidth={3.5}
						paintOrder="stroke"
					>
						{mark.label}
					</text>
				))}
		</g>
	);
}

function BoxShape({
	mark,
	color,
	failed,
	width,
	height,
	active,
}: {
	mark: AgentMark;
	color: string;
	failed: boolean;
	width: number;
	height: number;
	active: boolean;
}) {
	const x = Math.min(mark.from.x, mark.to.x);
	const y = Math.min(mark.from.y, mark.to.y);
	const w = Math.abs(mark.to.x - mark.from.x);
	const h = Math.abs(mark.to.y - mark.from.y);
	const sw = (failed ? 2 : 1.5) + (active ? 0.8 : 0);
	const ly = y > 16 ? y - 4 : Math.min(height - 4, y + h + 13);

	let fill = 'none';
	if (failed) {
		fill = 'rgba(220, 38, 38, 0.08)';
	} else if (active) {
		fill = 'rgba(21, 128, 61, 0.08)';
	}

	return (
		<g>
			<rect
				x={x + 0.5}
				y={y + 0.5}
				width={w}
				height={h}
				fill={fill}
				stroke={color}
				strokeWidth={sw}
			/>
			{mark.label && (
				<text
					x={clamp(x, 4, width - 40)}
					y={ly}
					textAnchor="start"
					fontFamily="system-ui, sans-serif"
					fontSize={11}
					fontWeight={600}
					fill={color}
					stroke={COLORS.halo}
					strokeWidth={3.5}
					paintOrder="stroke"
				>
					{mark.label}
				</text>
			)}
		</g>
	);
}

/** Returns the index of the agent mark nearest `pt` in snapshot pixels, or `null` beyond `threshold`. */
export function nearestAgentMark(
	pt: Point,
	marks: AgentMark[],
	threshold = 18,
): number | null {
	// Prefer measurement marks over reference lines so hovering a stem near the middle line picks the stem.
	let bestMeasure: { index: number; dist: number } | null = null;
	let bestRef: { index: number; dist: number } | null = null;

	marks.forEach((mark, index) => {
		const dist = distanceToMark(pt, mark);
		if (dist > threshold) {
			return;
		}
		if (mark.role === 'measure') {
			if (!bestMeasure || dist < bestMeasure.dist) {
				bestMeasure = { index, dist };
			}
		} else if (!bestRef || dist < bestRef.dist) {
			bestRef = { index, dist };
		}
	});

	if (bestMeasure) {
		return (bestMeasure as { index: number; dist: number }).index;
	}
	if (bestRef) {
		return (bestRef as { index: number; dist: number }).index;
	}
	return null;
}

function distanceToMark(pt: Point, mark: AgentMark): number {
	if (mark.kind === 'box') {
		const x0 = Math.min(mark.from.x, mark.to.x);
		const x1 = Math.max(mark.from.x, mark.to.x);
		const y0 = Math.min(mark.from.y, mark.to.y);
		const y1 = Math.max(mark.from.y, mark.to.y);
		const dx = Math.max(x0 - pt.x, 0, pt.x - x1);
		const dy = Math.max(y0 - pt.y, 0, pt.y - y1);
		return Math.hypot(dx, dy);
	}
	return distanceToSegment(pt, mark.from, mark.to);
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) {
		return Math.hypot(p.x - a.x, p.y - a.y);
	}
	const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq, 0, 1);
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high);
}

import type { AgentMark, Mark, Panel, Point } from '@vexml/vex/review-data';
import { type ReactNode, useRef, useState } from 'react';
import { AgentOverlaySvg, nearestAgentMark } from './agent-overlay';

// Marks as splates' web page draws them on an attached image (annotation-painter.ts and
// annotation.ts there), copied rather than shared so the two can drift apart: vivid
// magenta, which a score never has, over a white halo and a dark shadow, so a mark reads
// on any background; each numbered in a ringed disc just off it.

/** The marks' color. */
export const INK = '#ff1f8f';
/** The selected mark's number. */
const SELECTED = '#c2006a';

export type Tool = 'box' | 'arrow';

/** A mark with its place in the snapshot's list, which its number shows. */
export interface Placed {
	mark: Mark;
	at: number;
}

/**
 * One panel's image with its marks over it, in the snapshot's own pixels whatever size
 * the image shows at. A drag draws the tool's mark; a click pins; a number selects.
 */
export function MarkCanvas({
	src,
	panel,
	width,
	height,
	marks,
	agentMarks,
	showAgentMarks = true,
	hoveredAgentMark = null,
	drawing = true,
	tool,
	selected,
	onDraw,
	onSelect,
	onHoverAgentMark,
	children,
}: {
	src: string;
	panel: Panel;
	width: number;
	height: number;
	marks: Placed[];
	agentMarks?: AgentMark[];
	showAgentMarks?: boolean;
	hoveredAgentMark?: number | null;
	/** Whether a drag draws and a number selects; off, the marks only show. */
	drawing?: boolean;
	tool: Tool;
	selected: number | null;
	onDraw: (mark: Mark) => void;
	onSelect: (at: number | null) => void;
	onHoverAgentMark?: (index: number | null) => void;
	/** Shown over the image, placed by the caller in percentages of it. */
	children?: ReactNode;
}) {
	const svg = useRef<SVGSVGElement>(null);
	const [draft, setDraft] = useState<Mark | null>(null);
	const stroke = strokeFor(width);
	const badge = Math.max(11, stroke * 3);

	const toImage = (event: React.PointerEvent): Point => {
		const rect = svg.current?.getBoundingClientRect();
		if (!rect || rect.width === 0) {
			return { x: 0, y: 0 };
		}
		const scale = width / rect.width;
		return {
			x: clamp(Math.round((event.clientX - rect.left) * scale), 0, width),
			y: clamp(Math.round((event.clientY - rect.top) * scale), 0, height),
		};
	};

	const all: Placed[] = draft ? [...marks, { mark: draft, at: -1 }] : marks;

	return (
		<div className="relative select-none">
			<img
				src={src}
				alt={`${panel} render`}
				draggable={false}
				className="block h-auto w-full"
				style={{ maxWidth: width }}
			/>
			<svg
				ref={svg}
				role="img"
				aria-label={`${panel} marks`}
				viewBox={`0 0 ${width} ${height}`}
				className={`absolute inset-0 h-full w-full ${drawing ? 'cursor-crosshair touch-none' : ''}`}
				onPointerDown={(event) => {
					if (event.button !== 0 || !drawing) {
						return;
					}
					event.currentTarget.setPointerCapture(event.pointerId);
					const at = toImage(event);
					setDraft({ kind: tool, panel, from: at, to: at, note: '' });
				}}
				onPointerMove={(event) => {
					const at = toImage(event);
					if (draft) {
						setDraft({ ...draft, to: at });
						return;
					}
					if (showAgentMarks && agentMarks?.length && onHoverAgentMark) {
						onHoverAgentMark(nearestAgentMark(at, agentMarks));
					}
				}}
				onPointerLeave={() => {
					onHoverAgentMark?.(null);
				}}
				onPointerUp={() => {
					if (!draft) {
						return;
					}
					setDraft(null);
					// A short drag is a click, which pins whatever the tool, as in splates.
					const far = Math.hypot(
						draft.to.x - draft.from.x,
						draft.to.y - draft.from.y,
					);
					onDraw(
						far < stroke * 3
							? { ...draft, kind: 'pin', to: draft.from }
							: draft,
					);
				}}
				onPointerCancel={() => setDraft(null)}
			>
				<defs>
					<filter id="mark-shadow" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow
							dx="0"
							dy="0"
							stdDeviation={stroke * 0.75}
							floodColor="black"
							floodOpacity="0.55"
						/>
					</filter>
				</defs>
				{showAgentMarks && agentMarks && agentMarks.length > 0 && (
					<AgentOverlaySvg
						marks={agentMarks}
						width={width}
						height={height}
						hovered={hoveredAgentMark}
					/>
				)}
				{all.map(({ mark, at }) => (
					<g key={at} strokeLinecap="round" strokeLinejoin="round" fill="none">
						<path
							d={linePath(mark, anchor(mark, badge, stroke, width), stroke)}
							stroke="white"
							strokeWidth={stroke * 2}
							filter="url(#mark-shadow)"
						/>
						<path
							d={linePath(mark, anchor(mark, badge, stroke, width), stroke)}
							stroke={INK}
							strokeWidth={stroke}
						/>
					</g>
				))}
				{marks.map(({ mark, at }) => {
					const { x, y } = anchor(mark, badge, stroke, width);
					return (
						// biome-ignore lint/a11y/useSemanticElements: an SVG disc has no button element.
						<g
							key={`n${at}`}
							role="button"
							tabIndex={0}
							aria-label={`mark ${at + 1}`}
							className="cursor-pointer"
							onPointerDown={(event) => {
								if (!drawing) {
									return;
								}
								event.stopPropagation();
								onSelect(at === selected ? null : at);
							}}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									onSelect(at);
								}
							}}
						>
							<circle
								cx={x}
								cy={y}
								r={badge + stroke * 0.6}
								fill="white"
								filter="url(#mark-shadow)"
							/>
							<circle
								cx={x}
								cy={y}
								r={badge}
								fill={at === selected ? SELECTED : INK}
							/>
							<text
								x={x}
								y={y + badge * 0.06}
								fill="white"
								fontSize={Math.round(badge * 1.15)}
								fontWeight={700}
								fontFamily="system-ui, sans-serif"
								textAnchor="middle"
								dominantBaseline="central"
							>
								{at + 1}
							</text>
						</g>
					);
				})}
			</svg>
			{children}
		</div>
	);
}

/** How thick a mark's line is in the snapshot's pixels: thin enough for a staff line. */
export function strokeFor(width: number): number {
	return Math.max(3, Math.round(width / 250));
}

/** Where to draw a mark's number, or place what belongs beside it, in the snapshot's
 * pixels: off a box's top corner on the side with more room, behind an arrow's tail, or
 * above a pin. */
export function anchor(
	mark: Mark,
	badge: number,
	stroke: number,
	width: number,
): Point {
	const { from, to } = mark;
	const off = badge + stroke * 2;
	if (mark.kind === 'pin') {
		return { x: from.x, y: Math.max(badge, from.y - badge * 1.8) };
	}
	if (mark.kind === 'arrow') {
		const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
		return {
			x: clamp(from.x + ((from.x - to.x) / length) * off, badge, width - badge),
			y: Math.max(badge, from.y + ((from.y - to.y) / length) * off),
		};
	}
	const left = Math.min(from.x, to.x);
	const right = Math.max(from.x, to.x);
	const top = Math.min(from.y, to.y) + badge;
	const x = left >= width - right ? left - off : right + off;
	return { x: clamp(x, badge, width - badge), y: top };
}

/** A box's edges, an arrow with its head, or the stem from a pin's number to a ring. */
function linePath(mark: Mark, number: Point, stroke: number): string {
	const { from, to } = mark;
	if (mark.kind === 'box') {
		const x = Math.min(from.x, to.x);
		const y = Math.min(from.y, to.y);
		return `M${x} ${y}h${Math.abs(to.x - from.x)}v${Math.abs(to.y - from.y)}h${-Math.abs(to.x - from.x)}Z`;
	}
	if (mark.kind === 'arrow') {
		const angle = Math.atan2(to.y - from.y, to.x - from.x);
		const head = stroke * 4;
		const sides = [-1, 1].map(
			(side) =>
				`M${to.x} ${to.y}L${to.x - head * Math.cos(angle + side * 0.5)} ${to.y - head * Math.sin(angle + side * 0.5)}`,
		);
		return `M${from.x} ${from.y}L${to.x} ${to.y}${sides.join('')}`;
	}
	return `M${number.x} ${number.y}L${from.x} ${from.y}M${from.x + stroke} ${from.y}a${stroke} ${stroke} 0 1 0 ${-stroke * 2} 0a${stroke} ${stroke} 0 1 0 ${stroke * 2} 0`;
}

function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high);
}

import type { AgentMark } from '@vexml/vex/review-data';
import { Maximize2Icon } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AgentOverlaySvg, nearestAgentMark } from './agent-overlay';

/** One framed score image with optional measurement-mark overlay and an enlarge button. */
export function RuleScorePanel({
	src,
	alt,
	width,
	height,
	dashed,
	marks,
	hoveredMark,
	onHoverMark,
	onZoom,
	canvas,
}: {
	src: string;
	alt: string;
	width: number;
	height: number;
	dashed: boolean;
	marks: AgentMark[] | null;
	hoveredMark: number | null;
	onHoverMark?: (index: number | null) => void;
	onZoom: () => void;
	/** Drawn in place of the plain score, such as a canvas to mark it up on. */
	canvas?: ReactNode;
}) {
	return (
		<div
			className={`group relative overflow-hidden rounded-xl bg-white p-3 ${
				dashed ? 'border border-dashed border-input' : 'border'
			}`}
		>
			{canvas ?? (
				<RuleScoreCanvas
					src={src}
					alt={alt}
					width={width}
					height={height}
					marks={marks}
					hoveredMark={hoveredMark}
					onHoverMark={onHoverMark}
				/>
			)}
			<Button
				variant="secondary"
				size="icon-sm"
				aria-label={`Enlarge ${alt}`}
				title="Open larger"
				className="absolute top-2 right-2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
				onClick={onZoom}
			>
				<Maximize2Icon />
			</Button>
		</div>
	);
}

/** Responsive score image with an optional hover-interactive SVG overlay of agent marks. */
export function RuleScoreCanvas({
	src,
	alt,
	width,
	height,
	marks,
	hoveredMark,
	onHoverMark,
}: {
	src: string;
	alt: string;
	width: number;
	height: number;
	marks: AgentMark[] | null;
	hoveredMark: number | null;
	onHoverMark?: (index: number | null) => void;
}) {
	const handleMove = (e: MouseEvent<SVGSVGElement>) => {
		if (!marks || !onHoverMark || width <= 0 || height <= 0) {
			return;
		}
		const rect = e.currentTarget.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) {
			return;
		}
		const pt = {
			x: ((e.clientX - rect.left) / rect.width) * width,
			y: ((e.clientY - rect.top) / rect.height) * height,
		};
		onHoverMark(nearestAgentMark(pt, marks));
	};

	return (
		<div className="relative mx-auto w-full">
			<img
				src={src}
				alt={alt}
				width={width || undefined}
				height={height || undefined}
				draggable={false}
				className="block h-auto w-full select-none"
			/>
			{marks && marks.length > 0 && width > 0 && height > 0 && (
				<svg
					viewBox={`0 0 ${width} ${height}`}
					className="absolute inset-0 size-full"
					onMouseMove={handleMove}
					onMouseLeave={() => onHoverMark?.(null)}
				>
					<title>Measurement marks</title>
					<AgentOverlaySvg
						marks={marks}
						width={width}
						height={height}
						hovered={hoveredMark}
					/>
				</svg>
			)}
		</div>
	);
}

/** Single-line readout for a hovered or failing measurement mark below the score. */
export function RuleMarkReadout({ mark }: { mark: AgentMark }) {
	const isRef = mark.role === 'reference';
	const failed = !isRef && mark.pass === false;
	let dot = 'bg-emerald-700';
	if (isRef) {
		dot = 'bg-blue-600';
	} else if (failed) {
		dot = 'bg-red-600';
	}
	return (
		<div
			className={`mt-2.5 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
				failed ? 'bg-red-50 text-red-900' : 'bg-muted/60 text-foreground/85'
			}`}
		>
			<span className={`size-2 shrink-0 rounded-full ${dot}`} />
			<span className="min-w-0 truncate">
				{mark.note || mark.label || (failed ? 'Check failed' : 'Check passed')}
			</span>
		</div>
	);
}

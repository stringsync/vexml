import { useState } from 'react';
import { ENGINES, type Engine } from '../../vex/perf-events';
import { ENGINE_COLORS, ENGINE_LABELS, EngineDot } from './engines';
import { isError, ms, type RunState, slowest } from './run';

const COUNT = 25;
const WIDTH = 820;
const LABEL = 290;
const RIGHT = 90;
const ROW = 22;
const AXIS = 26;

/**
 * The fixtures where some engine was slowest, one row each, a dot per engine. A dot plot
 * rather than bars: three engines share a row, and what matters is how far apart they sit.
 */
export type Scale = 'linear' | 'log';

export function SlowestChart({
	state,
	scale,
	onSelect,
}: {
	state: RunState;
	/** Log, for when one outlier (the run's first render pays for warmup) squashes the rest. */
	scale: Scale;
	onSelect: (fixture: string) => void;
}) {
	const [hover, setHover] = useState<
		{ fixture: string; x: number; y: number } | undefined
	>();

	const rows = [...state.cells.entries()]
		.sort(([, a], [, b]) => slowest(b) - slowest(a))
		.slice(0, COUNT);
	if (rows.length === 0) {
		return (
			<p className="py-10 text-center text-sm text-muted-foreground">
				Waiting for the first render.
			</p>
		);
	}

	const max = niceMax(Math.max(...rows.map(([, cells]) => slowest(cells))));
	const height = rows.length * ROW + AXIS;
	const span = WIDTH - LABEL - RIGHT;
	const x =
		scale === 'linear'
			? (t: number) => LABEL + (t / max) * span
			: (t: number) =>
					LABEL +
					(Math.log10(Math.max(t, LOG_FLOOR) / LOG_FLOOR) /
						Math.log10(max / LOG_FLOOR)) *
						span;
	const ticks = scale === 'linear' ? tickValues(max) : logTicks(max);
	const hovered = hover && state.cells.get(hover.fixture);

	return (
		<div className="relative">
			<svg
				viewBox={`0 0 ${WIDTH} ${height}`}
				className="w-full font-mono text-2xs"
				role="img"
				aria-label={`Render times of the ${rows.length} slowest fixtures, per engine`}
			>
				{ticks.map((t) => (
					<g key={t}>
						<line
							x1={x(t)}
							x2={x(t)}
							y1={0}
							y2={height - AXIS + 4}
							className="stroke-border"
						/>
						<text
							x={x(t)}
							y={height - 8}
							textAnchor="middle"
							className="fill-muted-foreground"
						>
							{t === max ? `${t} ms` : t}
						</text>
					</g>
				))}
				{rows.map(([fixture, cells], i) => {
					const y = i * ROW + ROW / 2;
					const times = ENGINES.flatMap((engine) => {
						const t = ms(cells[engine]);
						return t === undefined ? [] : [t];
					});
					const failed = ENGINES.filter((engine) => isError(cells[engine]));
					return (
						// biome-ignore lint/a11y/useSemanticElements: an svg row has no button equivalent
						<g
							key={fixture}
							role="button"
							tabIndex={0}
							className="cursor-pointer outline-none [&:hover>rect]:fill-muted [&:focus-visible>rect]:fill-muted"
							onClick={() => onSelect(fixture)}
							onKeyDown={(e) => e.key === 'Enter' && onSelect(fixture)}
							onMouseMove={(e) => {
								const box =
									e.currentTarget.ownerSVGElement?.getBoundingClientRect();
								if (box) {
									setHover({
										fixture,
										x: e.clientX - box.left,
										y: e.clientY - box.top,
									});
								}
							}}
							onMouseLeave={() => setHover(undefined)}
						>
							<rect
								x={0}
								y={y - ROW / 2}
								width={WIDTH}
								height={ROW}
								rx={4}
								className="fill-transparent"
							/>
							<text
								x={LABEL - 12}
								y={y + 4}
								textAnchor="end"
								className="fill-secondary-foreground"
							>
								{fixture}
							</text>
							{times.length > 1 && (
								<line
									x1={x(Math.min(...times))}
									x2={x(Math.max(...times))}
									y1={y}
									y2={y}
									strokeWidth={2}
									className="stroke-track"
								/>
							)}
							{ENGINES.map((engine) => {
								const t = ms(cells[engine]);
								return t === undefined ? null : (
									<circle
										key={engine}
										cx={x(t)}
										cy={y}
										r={5}
										fill={ENGINE_COLORS[engine]}
										strokeWidth={2}
										className="stroke-card"
									/>
								);
							})}
							{failed.length > 0 && (
								<text
									x={WIDTH - RIGHT + 10}
									y={y + 4}
									className="fill-destructive"
								>
									{failed.map((engine) => ENGINE_LABELS[engine]).join(', ')}{' '}
									failed
								</text>
							)}
						</g>
					);
				})}
			</svg>
			{hover && hovered && (
				<div
					className="pointer-events-none absolute z-10 flex flex-col gap-1 rounded-lg border bg-popover px-3 py-2 text-2xs shadow-md"
					style={{ left: Math.min(hover.x + 14, 560), top: hover.y + 14 }}
				>
					<span className="font-mono font-medium text-foreground">
						{hover.fixture}
					</span>
					{ENGINES.map((engine) => (
						<TipLine key={engine} engine={engine} cell={hovered[engine]} />
					))}
				</div>
			)}
		</div>
	);
}

function TipLine({
	engine,
	cell,
}: {
	engine: Engine;
	cell: Parameters<typeof ms>[0];
}) {
	return (
		<span className="flex items-center gap-2 text-secondary-foreground">
			<EngineDot engine={engine} />
			<span className="w-14">{ENGINE_LABELS[engine]}</span>
			<span className="font-mono tabular-nums">
				<TipTime cell={cell} />
			</span>
		</span>
	);
}

function TipTime({ cell }: { cell: Parameters<typeof ms>[0] }) {
	if (isError(cell)) {
		return <span className="text-destructive">failed</span>;
	}
	return cell ? `${cell.ms} ms` : '…';
}

/** Where the log axis starts: no render comes in under 10ms. */
const LOG_FLOOR = 10;

function logTicks(max: number): number[] {
	const ticks: number[] = [];
	for (let decade = LOG_FLOOR; decade <= max; decade *= 10) {
		for (const step of [1, 2, 5]) {
			if (decade * step <= max) {
				ticks.push(decade * step);
			}
		}
	}
	return ticks;
}

/** Rounds the axis up to a step a reader can count in. */
function niceMax(t: number): number {
	const step = tickStep(t);
	return Math.max(step, Math.ceil(t / step) * step);
}

function tickStep(t: number): number {
	if (t <= 100) {
		return 20;
	}
	if (t <= 250) {
		return 50;
	}
	if (t <= 1000) {
		return 100;
	}
	return 500;
}

function tickValues(max: number): number[] {
	const step = tickStep(max);
	const ticks: number[] = [];
	for (let t = 0; t <= max; t += step) {
		ticks.push(t);
	}
	return ticks;
}

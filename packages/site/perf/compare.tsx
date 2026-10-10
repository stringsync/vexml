import { cn } from 'cn';
import {
	ChevronDownIcon,
	ChevronUpIcon,
	ExternalLinkIcon,
	RotateCcwIcon,
	XIcon,
} from 'lucide-react';
import { Segmented } from '@/components/segmented';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
	type Cell,
	ENGINES,
	type Engine,
	imagePath,
} from '../../vex/perf-events';
import { ENGINE_LABELS, EngineDot } from './engines';
import { isError } from './run';

export type Layout = 'columns' | 'stacked';

/**
 * One fixture through every engine, the images in the same order as the table's columns.
 * Side by side is for the overall shape; stacked gives each image the full width, for
 * reading a detail.
 */
export function Compare({
	fixture,
	cells,
	busy,
	queued,
	version,
	layout,
	onLayout,
	onStep,
	onRetry,
	onClose,
}: {
	fixture: string;
	cells: Partial<Record<Engine, Cell>>;
	/** The engine rendering this fixture now, if the run or a retry is on it. */
	busy: Engine | undefined;
	/** Queued to render again and not back yet. */
	queued: boolean;
	/** Bumped by each retry, so the images reload rather than show the browser's copies. */
	version: number;
	layout: Layout;
	onLayout: (layout: Layout) => void;
	onStep: (by: 1 | -1) => void;
	onRetry: () => void;
	onClose: () => void;
}) {
	// Every image at one scale, the widest filling its column: the engines draw at different
	// page widths, and fitting each to its column would enlarge the narrower ones.
	const widest = Math.max(
		1,
		...ENGINES.map((engine) => width(cells[engine]) ?? 0),
	);
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<h2 className="mr-auto truncate font-mono text-base font-medium">
					{fixture}
				</h2>
				<span className="hidden text-2xs text-faint lg:inline">
					j/k to step, r to retry, esc to close
				</span>
				<Button variant="outline" size="sm" onClick={onRetry} disabled={queued}>
					{queued ? <Spinner /> : <RotateCcwIcon />}
					{retryLabel(queued, busy)}
				</Button>
				<Segmented
					value={layout}
					onChange={onLayout}
					options={[
						{ value: 'columns', label: 'Side by side' },
						{ value: 'stacked', label: 'Stacked' },
					]}
					label="Image layout"
					size="sm"
					className="bg-card"
				/>
				<Button
					variant="outline"
					size="icon-sm"
					onClick={() => onStep(-1)}
					aria-label="Previous fixture"
				>
					<ChevronUpIcon />
				</Button>
				<Button
					variant="outline"
					size="icon-sm"
					onClick={() => onStep(1)}
					aria-label="Next fixture"
				>
					<ChevronDownIcon />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClose}
					aria-label="Back to the overview"
				>
					<XIcon />
				</Button>
			</div>
			<div
				className={cn(
					'grid gap-3',
					layout === 'columns' ? 'grid-cols-3 items-start' : 'grid-cols-1',
				)}
			>
				{ENGINES.map((engine) => (
					<Output
						key={engine}
						fixture={fixture}
						engine={engine}
						cell={cells[engine]}
						busy={busy === engine}
						queued={queued}
						version={version}
						widest={widest}
					/>
				))}
			</div>
		</div>
	);
}

function Output({
	fixture,
	engine,
	cell,
	busy,
	queued,
	version,
	widest,
}: {
	fixture: string;
	engine: Engine;
	cell: Cell | undefined;
	busy: boolean;
	queued: boolean;
	version: number;
	widest: number;
}) {
	const src = `${imagePath(fixture, engine)}?v=${version}`;
	return (
		<Card size="sm" className="gap-2">
			<CardContent className="flex items-center gap-2 text-sm">
				<EngineDot engine={engine} />
				<span className="font-medium">{ENGINE_LABELS[engine]}</span>
				{cell && !isError(cell) && (
					<>
						<span className="ml-auto font-mono text-xs tabular-nums">
							{cell.ms} ms
						</span>
						<span className="font-mono text-2xs text-muted-foreground tabular-nums">
							{cell.size}
						</span>
						<a
							href={src}
							target="_blank"
							rel="noreferrer"
							className="text-faint hover:text-foreground"
							aria-label={`Open the ${ENGINE_LABELS[engine]} image at full size`}
						>
							<ExternalLinkIcon className="size-3.5" />
						</a>
					</>
				)}
			</CardContent>
			<CardContent>
				<OutputBody
					src={src}
					engine={engine}
					cell={cell}
					busy={busy}
					queued={queued}
					widest={widest}
				/>
			</CardContent>
		</Card>
	);
}

function OutputBody({
	src,
	engine,
	cell,
	busy,
	queued,
	widest,
}: {
	src: string;
	engine: Engine;
	cell: Cell | undefined;
	busy: boolean;
	queued: boolean;
	widest: number;
}) {
	if (isError(cell)) {
		return (
			<Alert variant="destructive">
				<AlertTitle>{ENGINE_LABELS[engine]} failed</AlertTitle>
				<AlertDescription className="font-mono text-2xs break-all whitespace-pre-wrap">
					{cell.error}
				</AlertDescription>
			</Alert>
		);
	}
	if (!cell) {
		return (
			<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
				{busy ? (
					<>
						<Spinner className="size-4" /> Rendering
					</>
				) : (
					waitingLabel(queued)
				)}
			</div>
		);
	}
	return (
		<img
			src={src}
			alt={`${ENGINE_LABELS[engine]}'s rendering`}
			style={{ width: `${((width(cell) ?? widest) / widest) * 100}%` }}
			className="rounded-md ring-1 ring-border"
		/>
	);
}

function retryLabel(queued: boolean, busy: Engine | undefined): string {
	if (!queued) {
		return 'Retry';
	}
	return busy ? 'Retrying' : 'Queued';
}

function waitingLabel(queued: boolean): string {
	// A retry asked for mid-run waits for the run, so as not to skew either's times.
	return queued ? 'Queued to retry' : 'Not rendered yet';
}

/** A rendered cell's pixel width, read off its `WIDTHxHEIGHT`. */
function width(cell: Cell | undefined): number | undefined {
	if (!cell || isError(cell)) {
		return undefined;
	}
	return Number(cell.size.split('x')[0]) || undefined;
}

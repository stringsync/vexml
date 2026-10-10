import { Card, CardContent } from '@/components/ui/card';
import { ENGINES, type Engine } from '../../vex/perf-events';
import { ENGINE_LABELS, EngineDot } from './engines';
import { type RunState, stats } from './run';

export function StatCards({ state }: { state: RunState }) {
	return (
		<div className="grid grid-cols-3 gap-3">
			{ENGINES.map((engine) => (
				<StatCard key={engine} engine={engine} state={state} />
			))}
		</div>
	);
}

function StatCard({ engine, state }: { engine: Engine; state: RunState }) {
	const s = stats(state, engine);
	return (
		<Card size="sm" className="gap-1">
			<CardContent className="flex flex-col gap-1">
				<div className="flex items-center gap-2 text-sm text-secondary-foreground">
					<EngineDot engine={engine} />
					{ENGINE_LABELS[engine]}
					<span className="text-muted-foreground">median</span>
				</div>
				<div className="font-mono text-2xl font-medium tabular-nums">
					{s.median === undefined ? '-' : `${Math.round(s.median)} ms`}
				</div>
				<div className="flex flex-wrap gap-x-3 font-mono text-2xs whitespace-nowrap text-muted-foreground tabular-nums">
					<span>mean {s.mean === undefined ? '-' : s.mean.toFixed(1)}</span>
					<span>max {s.max ?? '-'}</span>
					<span>{s.rendered} ok</span>
					{s.failed > 0 && (
						<span className="text-destructive">{s.failed} failed</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

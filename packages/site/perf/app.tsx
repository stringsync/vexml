import { useEffect, useRef, useState } from 'react';
import { Segmented } from '@/components/segmented';
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { ENGINES } from '../../vex/perf-events';
import { Compare, type Layout } from './compare';
import { ENGINE_LABELS, EngineDot } from './engines';
import {
	FixtureTable,
	RUN_ORDER,
	type Sort,
	visibleFixtures,
} from './fixture-table';
import { PerfHeader } from './header';
import { current } from './run';
import { type Scale, SlowestChart } from './slowest-chart';
import { StatCards } from './stat-cards';
import { usePerfRun } from './use-perf-run';

export function PerfApp() {
	const { state, connected } = usePerfRun();
	const [selected, setSelected] = useState<string | undefined>();
	const [scale, setScale] = useState<Scale>('linear');
	const [layout, setLayout] = useState<Layout>('columns');
	const [query, setQuery] = useState('');
	const [sort, setSort] = useState<Sort>(RUN_ORDER);
	const fixtures = visibleFixtures(state, query, sort);
	const now = current(state);

	// Stepping follows the table as it stands: filtered and sorted. A ref, so the key
	// listener is bound once rather than on every event the run sends.
	const step = useRef((_by: 1 | -1) => {});
	step.current = (by) => {
		if (fixtures.length === 0) {
			return;
		}
		const at = selected ? fixtures.indexOf(selected) : -1;
		const next =
			at === -1 ? 0 : Math.min(fixtures.length - 1, Math.max(0, at + by));
		setSelected(fixtures[next]);
	};

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) {
				return;
			}
			if (e.key === 'j' || e.key === 'ArrowDown') {
				e.preventDefault();
				step.current(1);
			} else if (e.key === 'k' || e.key === 'ArrowUp') {
				e.preventDefault();
				step.current(-1);
			} else if (e.key === 'Escape') {
				setSelected(undefined);
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	return (
		<div className="flex h-dvh flex-col bg-background text-foreground">
			<PerfHeader state={state} connected={connected} />
			<main className="flex min-h-0 flex-1">
				<aside className="flex w-[440px] shrink-0 flex-col border-r bg-card">
					<FixtureTable
						state={state}
						fixtures={fixtures}
						query={query}
						onQuery={setQuery}
						sort={sort}
						onSort={setSort}
						selected={selected}
						onSelect={setSelected}
					/>
				</aside>
				<section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
					<StatCards state={state} />
					{selected ? (
						<Compare
							fixture={selected}
							cells={state.cells.get(selected) ?? {}}
							busy={now?.fixture === selected ? now.engine : undefined}
							layout={layout}
							onLayout={setLayout}
							onStep={(by) => step.current(by)}
							onClose={() => setSelected(undefined)}
						/>
					) : (
						<Card>
							<CardHeader>
								<CardTitle>Slowest fixtures</CardTitle>
								<div className="flex gap-4 text-xs text-secondary-foreground">
									{ENGINES.map((engine) => (
										<span
											key={engine}
											className="inline-flex items-center gap-1.5"
										>
											<EngineDot engine={engine} />
											{ENGINE_LABELS[engine]}
										</span>
									))}
								</div>
								<CardAction>
									<Segmented
										value={scale}
										onChange={setScale}
										options={[
											{ value: 'linear', label: 'Linear' },
											{ value: 'log', label: 'Log' },
										]}
										label="Time axis scale"
										size="sm"
										className="bg-muted"
									/>
								</CardAction>
							</CardHeader>
							<CardContent>
								<SlowestChart
									state={state}
									scale={scale}
									onSelect={setSelected}
								/>
							</CardContent>
						</Card>
					)}
				</section>
			</main>
		</div>
	);
}

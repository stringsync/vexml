import { CircleCheckIcon, UnplugIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { ENGINE_LABELS } from './engines';
import { current, type RunState, total } from './run';
import { useElapsed } from './use-perf-run';

export function PerfHeader({
	state,
	connected,
}: {
	state: RunState;
	connected: boolean;
}) {
	const running = connected && !state.done && state.fixtures.length > 0;
	const elapsed = useElapsed(state.at, state.heardAt, running);
	const all = total(state);
	const now = current(state);

	return (
		<header className="shrink-0 border-b bg-card">
			<div className="flex h-14 items-center gap-5 px-5">
				<div className="font-display text-[22px] leading-none font-black tracking-[-0.5px] italic font-stretch-125%">
					ve<span className="text-brand">x</span>ml
				</div>
				<span className="font-mono text-sm text-muted-foreground">perf</span>

				<Status running={running} done={state.done} connected={connected} />

				<div className="ml-auto flex items-center gap-5 font-mono text-xs text-secondary-foreground tabular-nums">
					{now && (
						<span className="hidden truncate text-muted-foreground md:inline">
							{now.fixture} · {ENGINE_LABELS[now.engine]}
						</span>
					)}
					<span>
						{state.renders} / {all || '…'} renders
					</span>
					<span className="w-16 text-right">
						{(elapsed / 1000).toFixed(1)}s
					</span>
				</div>
			</div>
			{/* The track is the header's bottom edge, so it reads as the page filling in. */}
			<Progress
				value={all ? (state.renders / all) * 100 : 0}
				className="h-0.5 rounded-none bg-track [&>[data-slot=progress-indicator]]:bg-brand"
			/>
		</header>
	);
}

function Status({
	running,
	done,
	connected,
}: {
	running: boolean;
	done: boolean;
	connected: boolean;
}) {
	if (done) {
		return (
			<span className="inline-flex items-center gap-1.5 text-sm text-success">
				<CircleCheckIcon className="size-4" /> Done
			</span>
		);
	}
	if (!connected) {
		return (
			<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
				<UnplugIcon className="size-4" /> vex perf stopped
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 text-sm text-secondary-foreground">
			<Spinner className="size-4" /> {running ? 'Rendering' : 'Starting'}
		</span>
	);
}

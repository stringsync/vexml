import type { ReactNode } from 'react';

export function Section({
	title,
	action,
	children,
}: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
					{title}
				</span>
				{action}
			</div>
			{children}
		</div>
	);
}

export function Or() {
	return (
		<div className="flex items-center gap-2 text-xs text-zinc-400">
			<span className="h-px flex-1 bg-zinc-200" />
			or
			<span className="h-px flex-1 bg-zinc-200" />
		</div>
	);
}

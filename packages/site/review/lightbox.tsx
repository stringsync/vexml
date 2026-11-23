import type { Panel } from '@vexml/vex/review-data';
import type { ReactNode } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Kbd } from './kbd';

const LABELS: Record<Panel, string> = {
	before: 'Before',
	diff: 'Diff',
	after: 'After',
};

/**
 * One panel of a snapshot as large as the window allows, to inspect it or draw on it.
 * Left and right step through the snapshot's panels; Escape closes it.
 */
export function Lightbox({
	name,
	panels,
	panel,
	width,
	onPanel,
	onClose,
	children,
}: {
	name: string;
	panels: Panel[];
	/** The panel shown, or null while closed. */
	panel: Panel | null;
	/** The image's own width, in pixels. */
	width: number;
	onPanel: (panel: Panel) => void;
	onClose: () => void;
	/** The panel's canvas, which sizes itself to the width given it. */
	children: ReactNode;
}) {
	const step = (by: number) => {
		if (panel === null) {
			return;
		}
		const next = panels[panels.indexOf(panel) + by];
		if (next) {
			onPanel(next);
		}
	};
	// As wide as the window allows, at least the image's own width so a tall score
	// stays readable; it scrolls when taller than the window.
	const fit = `min(calc(100vw - 4rem), ${Math.max(width, 1000)}px)`;
	return (
		<Dialog open={panel !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="flex max-h-[calc(100vh-2rem)] w-auto max-w-none flex-col gap-3 p-4 sm:max-w-none"
				onKeyDown={(e) => {
					if (e.key === 'ArrowLeft') {
						step(-1);
					} else if (e.key === 'ArrowRight') {
						step(1);
					}
				}}
			>
				<div className="flex items-center gap-3 pr-8">
					<DialogTitle className="font-mono text-sm">{name}</DialogTitle>
					<DialogDescription className="sr-only">
						One panel of the snapshot, enlarged.
					</DialogDescription>
					{panels.length > 1 && panel && (
						<>
							<ToggleGroup
								type="single"
								variant="outline"
								size="sm"
								spacing={0}
								value={panel}
								onValueChange={(value) => value && onPanel(value as Panel)}
								className="ml-auto"
							>
								{panels.map((p) => (
									<ToggleGroupItem
										key={p}
										value={p}
										className="px-3 data-[state=on]:bg-foreground data-[state=on]:text-background"
									>
										{LABELS[p]}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
							<span className="text-2xs text-muted-foreground">
								<Kbd>←</Kbd> <Kbd>→</Kbd>
							</span>
						</>
					)}
				</div>
				<div
					className="min-h-0 shrink overflow-y-auto rounded-lg border bg-white"
					style={{ width: fit }}
				>
					{children}
				</div>
			</DialogContent>
		</Dialog>
	);
}

import { PanelLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header({ onOpenControls }: { onOpenControls: () => void }) {
	return (
		<header className="flex items-center gap-3 border-b bg-background px-3 py-2 md:px-6">
			{/* Below md the control panel is a Sheet, and this is the only way to reach it. */}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={onOpenControls}
				aria-label="Show controls"
				className="md:hidden"
			>
				<PanelLeftIcon />
			</Button>
			<h1 className="font-mono text-xl font-bold tracking-tight">vexml</h1>
			<Button variant="ghost" size="sm" asChild>
				<a
					href="https://github.com/stringsync/vexml"
					target="_blank"
					rel="noreferrer"
				>
					<img
						src="https://img.shields.io/github/stars/stringsync/vexml?style=social"
						alt="GitHub stars"
					/>
				</a>
			</Button>
		</header>
	);
}

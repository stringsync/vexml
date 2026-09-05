import { MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header({ onOpenControls }: { onOpenControls: () => void }) {
	return (
		<header className="flex items-center gap-2 border-b bg-background px-3 py-2 md:px-6">
			{/* Below md the control panel is a Sheet, and this is the only way to reach it. */}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={onOpenControls}
				aria-label="Show controls"
				className="md:hidden"
			>
				<MenuIcon />
			</Button>
			<h1 className="font-mono text-xl font-bold tracking-tight">vexml</h1>
			{/* A bare anchor, not a Button: the badge is already a pill, and button padding
			    around it just reads as a stray margin. */}
			<a
				href="https://github.com/stringsync/vexml"
				target="_blank"
				rel="noreferrer"
				className="flex rounded-md"
			>
				<img
					src="https://img.shields.io/github/stars/stringsync/vexml?style=social"
					alt="GitHub stars"
				/>
			</a>
		</header>
	);
}

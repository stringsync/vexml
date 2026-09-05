import { Button } from '@/components/ui/button';

export function Header() {
	return (
		<header className="flex items-center gap-3 border-b bg-background px-6 py-2">
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

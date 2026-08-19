export function Header() {
	return (
		<header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-6 py-2">
			<h1 className="font-mono text-xl font-bold tracking-tight">vexml</h1>
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
		</header>
	);
}

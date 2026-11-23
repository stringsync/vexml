/** A key the page answers to, shown beside the control it presses. */
export function Kbd({
	children,
	inverted,
}: {
	children: string;
	inverted?: boolean;
}) {
	return (
		<kbd
			className={`rounded border px-1 font-mono text-[11px] leading-4 ${inverted ? 'border-current/30 opacity-80' : 'text-muted-foreground'}`}
		>
			{children}
		</kbd>
	);
}

import type { JSX } from "react";

export interface ChipProps {
	label: string;
	onRemove?: () => void;
}

/** One tag, with a button to drop it when it can be dropped. */
function Chip({ label, onRemove }: ChipProps): JSX.Element {
	return (
		<span className="chip">
			{label}
			{onRemove && (
				<button type="button" onClick={onRemove}>
					x
				</button>
			)}
		</span>
	);
}

/** A row of tags over a list: tapping one shows only what has it. */
export function TagFilter({
	tags,
	selected,
	onSelect,
}: {
	tags: string[];
	selected: string | null;
	onSelect: (tag: string | null) => void;
}): JSX.Element {
	return (
		<div role="toolbar">
			{tags.map((tag) => (
				<button
					key={tag}
					type="button"
					aria-pressed={selected === tag}
					onClick={() => onSelect(selected === tag ? null : tag)}
				>
					<Chip label={tag} />
				</button>
			))}
		</div>
	);
}

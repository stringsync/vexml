import type { Layout } from '@stringsync/vexml';
import { MoveHorizontalIcon, Rows3Icon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

type LayoutType = Layout['type'];

// The two views, in the order they sit in the control.
const VIEWS: Array<{
	type: LayoutType;
	icon: typeof Rows3Icon;
	label: string;
	hint: string;
}> = [
	{
		type: 'standard',
		icon: Rows3Icon,
		label: 'Stacked view',
		hint: 'Stacked: measures wrap onto systems down the page',
	},
	{
		type: 'panoramic',
		icon: MoveHorizontalIcon,
		label: 'Panoramic view',
		hint: 'Panoramic: every measure on one system, scrolling sideways',
	},
];

// Which view the score is drawn in. Icons only: it sits in the corner above the score, where a
// pair of words would compete with the timing badge for the eye.
export function LayoutToggle({
	value,
	onChange,
	className,
}: {
	value: LayoutType;
	onChange: (type: LayoutType) => void;
	className?: string;
}) {
	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			value={value}
			// Radix reports '' when the pressed item is toggled off; a view is always showing, so
			// that deselection is not a state this can be in.
			onValueChange={(next) => next && onChange(next as LayoutType)}
			className={className}
			aria-label="Score view"
		>
			{VIEWS.map(({ type, icon: Icon, label, hint }) => (
				<Tooltip key={type}>
					<TooltipTrigger asChild>
						<ToggleGroupItem value={type} aria-label={label}>
							<Icon />
						</ToggleGroupItem>
					</TooltipTrigger>
					<TooltipContent>{hint}</TooltipContent>
				</Tooltip>
			))}
		</ToggleGroup>
	);
}

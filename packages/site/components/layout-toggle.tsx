import type { Layout } from '@stringsync/vexml';
import { MoveHorizontalIcon, Rows3Icon } from 'lucide-react';
import { Segmented, type SegmentedOption } from './segmented';

type LayoutType = Layout['type'];

// The two views, in the order they sit in the control.
const VIEWS: ReadonlyArray<SegmentedOption<LayoutType>> = [
	{
		value: 'standard',
		label: 'Stacked',
		icon: Rows3Icon,
		hint: 'Stacked: measures wrap onto systems down the page',
	},
	{
		value: 'panoramic',
		label: 'Panoramic',
		icon: MoveHorizontalIcon,
		hint: 'Panoramic: every measure on one system, scrolling sideways',
	},
];

// The Layout section shares this control between the sidebar and mobile sheet.
export function LayoutToggle({
	value,
	onChange,
	size,
	className,
}: {
	value: LayoutType;
	onChange: (type: LayoutType) => void;
	size?: 'sm' | 'default';
	className?: string;
}) {
	return (
		<Segmented
			value={value}
			onChange={onChange}
			options={VIEWS}
			label="Score view"
			stretch
			size={size}
			className={className}
		/>
	);
}

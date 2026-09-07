import {
	ChevronDownIcon,
	EyeIcon,
	FilePlus2Icon,
	PencilIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { ScoreMode } from '@/lib/score-session';
import { Segmented } from './segmented';

/** Document actions and the small set of tools relevant to the current selection. */
export function EditingToolbar({
	title,
	error,
	voices,
	activeVoice,
	onVoiceChange,
	mode,
	playing,
	onModeChange,
	onNew,
	children,
}: {
	title: string;
	error: string | null;
	voices: readonly { value: string; label: string }[];
	activeVoice: string;
	onVoiceChange: (value: string) => void;
	mode: ScoreMode;
	playing: boolean;
	onModeChange: (mode: ScoreMode) => void;
	onNew: (kind: 'staff' | 'tab') => void;
	children?: ReactNode;
}) {
	return (
		<section
			aria-label="Notation editor"
			className="flex flex-col gap-2 border-b bg-card px-4 py-3 md:px-6"
		>
			<div className="flex flex-wrap items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<FilePlus2Icon data-icon="inline-start" />
							New notation
							<ChevronDownIcon data-icon="inline-end" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuGroup>
							<DropdownMenuItem onSelect={() => onNew('staff')}>
								Treble staff
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => onNew('tab')}>
								Guitar tablature
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
					{title}
				</span>
				<Segmented<ScoreMode>
					value={mode}
					onChange={onModeChange}
					label="Interaction mode"
					options={[
						{ value: 'view', label: 'View', icon: EyeIcon },
						{ value: 'edit', label: 'Edit', icon: PencilIcon },
					]}
					className="ml-auto"
				/>
				{voices.length > 1 && (
					<Select
						value={activeVoice}
						onValueChange={onVoiceChange}
						disabled={playing || mode !== 'edit'}
					>
						<SelectTrigger aria-label="Editing voice">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{voices.map((voice) => (
									<SelectItem key={voice.value} value={voice.value}>
										{voice.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				)}
			</div>
			{children}
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
		</section>
	);
}

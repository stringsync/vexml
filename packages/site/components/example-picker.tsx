import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';

// A dropdown of the fixtures that filters as you type, since there are too many to scroll.
export function ExamplePicker({
	id,
	value,
	names,
	onChange,
	className,
}: {
	id?: string;
	value: string | undefined;
	names: ReadonlyArray<string>;
	onChange: (name: string) => void;
	className?: string;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					role="combobox"
					aria-expanded={open}
					className={cn(
						'flex h-9 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50',
						className,
					)}
				>
					<span className={cn('truncate', !value && 'text-muted-foreground')}>
						{value ?? 'Load an example…'}
					</span>
					<ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) min-w-64 p-0"
			>
				<Command>
					<CommandInput placeholder="Search examples…" />
					<CommandList>
						<CommandEmpty>No examples match.</CommandEmpty>
						<CommandGroup>
							{names.map((name) => (
								<CommandItem
									key={name}
									value={name}
									data-checked={name === value}
									className="font-mono"
									onSelect={() => {
										onChange(name);
										setOpen(false);
									}}
								>
									<span className="truncate">{name}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

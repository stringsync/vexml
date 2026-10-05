import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragStartEvent,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	ArchiveIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	GripVerticalIcon,
	PencilIcon,
	PlusIcon,
	TagIcon,
	TrashIcon,
} from "lucide-react";
import {
	createContext,
	type JSX,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Badge } from "#app/components/ui/badge.tsx";
import { Button } from "#app/components/ui/button.tsx";
import { Card } from "#app/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#app/components/ui/dialog.tsx";
import { Input } from "#app/components/ui/input.tsx";
import { Textarea } from "#app/components/ui/textarea.tsx";
import { cn } from "#app/lib/utils.ts";
import type { Task } from "./api";
import { save } from "./api";

/** The open tasks, in the order they will be done; drag one to move it. */
export function TaskBoard({ tasks }: { tasks: Task[] }): JSX.Element {
	const [order, setOrder] = useState(tasks.map((task) => task.id));
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);
	const onDragEnd = ({ active, over }: DragEndEvent) => {
		if (over !== null && active.id !== over.id) {
			const moved = arrayMove(order, order.indexOf(Number(active.id)), order.indexOf(Number(over.id)));
			setOrder(moved);
			void save(moved);
		}
	};
	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
			<SortableContext items={order} strategy={verticalListSortingStrategy}>
				{order.map((id) => (
					<Row key={id} task={tasks.find((task) => task.id === id)} />
				))}
			</SortableContext>
		</DndContext>
	);
}

function Row({ task }: { task?: Task }): JSX.Element | null {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task?.id ?? 0 });
	if (task === undefined) {
		return null;
	}
	return (
		<Card ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex gap-2 p-2")}>
			<GripVerticalIcon {...attributes} {...listeners} />
			<span>{task.title}</span>
			{task.tags.map((tag) => (
				<Badge key={tag}>
					<TagIcon /> {tag}
				</Badge>
			))}
			<Button variant="ghost" size="icon" aria-label="done">
				<CheckIcon />
			</Button>
		</Card>
	);
}

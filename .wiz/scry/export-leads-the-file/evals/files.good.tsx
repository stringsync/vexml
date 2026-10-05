import { useEffect, useState } from "react";

/** Files to attach to a message: the ones already sent, and new ones picked or pasted. */
export function useFiles(stored: string[] = []) {
	const [added, setAdded] = useState<File[]>([]);
	const [kept, setKept] = useState(stored);
	const [dragging, setDragging] = useState(false);

	useEffect(() => setKept(stored), [stored]);

	useEffect(() => {
		const paste = (event: ClipboardEvent) => {
			const pasted = [...(event.clipboardData?.files ?? [])];
			if (pasted.length > 0) {
				setAdded((files) => [...files, ...pasted]);
			}
		};
		document.addEventListener("paste", paste);
		return () => document.removeEventListener("paste", paste);
	}, []);

	return {
		added,
		kept,
		dragging,
		/** Adds files picked from a dialog or dropped on the page. */
		add(files: FileList | File[]) {
			setAdded((current) => [...current, ...files]);
			setDragging(false);
		},
		/** Drops a file that has not been sent yet. */
		remove(file: File) {
			setAdded((current) => current.filter((each) => each !== file));
		},
		/** Drops a file that was sent before. */
		forget(path: string) {
			setKept((current) => current.filter((each) => each !== path));
		},
		/** Shows the page as a drop target while a file is dragged over it. */
		drag(over: boolean) {
			setDragging(over);
		},
		/** Empties the list once the message is sent. */
		clear() {
			setAdded([]);
			setKept([]);
		},
		/** Whether there is anything to attach. */
		get empty() {
			return added.length === 0 && kept.length === 0;
		},
	};
}

/** What `useFiles` returns, for the components that show and change it. */
export type Files = ReturnType<typeof useFiles>;

/** Each file to attach, by name, with a button to drop it. */
export function FileList({ files }: { files: Files }) {
	return (
		<ul>
			{files.added.map((file) => (
				<li key={file.name}>
					{file.name}
					<button type="button" onClick={() => files.remove(file)}>
						x
					</button>
				</li>
			))}
		</ul>
	);
}

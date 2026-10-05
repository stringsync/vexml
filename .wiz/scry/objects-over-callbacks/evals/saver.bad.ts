export class Saver {
	save(path: string, onDone: () => void): void {
		write(path);
		onDone();
	}
}

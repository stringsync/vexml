export class Saver {
	private readonly files: FileSystem;
	private readonly path: string;

	constructor(files: FileSystem, path: string) {
		this.files = files;
		this.path = path;
	}
}

import type { Output, Printer } from "./process-ctx";

/** Output cut into whole lines, each handed on as it completes. */
export class LineOutput implements Output {
	private partial = "";

	constructor(private readonly printer: Printer) {}

	write(text: string): void {
		const lines = (this.partial + text).split("\n");
		this.partial = lines.pop() ?? "";
		for (const each of lines) {
			this.printer.print(each);
		}
	}

	flush(): void {
		if (this.partial) {
			this.printer.print(this.partial);
			this.partial = "";
		}
	}
}

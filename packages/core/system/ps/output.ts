/** A stream a fake writes to: bytes in as they are pushed, closed once. */
export class Output {
	readonly stream: ReadableStream<Uint8Array>;
	private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
	private closed = false;

	constructor() {
		this.stream = new ReadableStream({
			start: (controller) => {
				this.controller = controller;
			},
		});
	}

	push(data: string | Uint8Array): void {
		if (!this.closed) {
			this.controller?.enqueue(
				typeof data === "string" ? new TextEncoder().encode(data) : data,
			);
		}
	}

	close(): void {
		if (!this.closed) {
			this.closed = true;
			this.controller?.close();
		}
	}
}

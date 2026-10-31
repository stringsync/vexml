/**
 * Saves what is at `url` under `filename`, by clicking a link the user never
 * sees. Works with an object URL, so anything held in memory can be saved:
 *
 * ```ts
 * const url = URL.createObjectURL(blob);
 * download(url, "export.csv");
 * URL.revokeObjectURL(url);
 * ```
 */
export function download(url: string, filename: string): void {
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
}

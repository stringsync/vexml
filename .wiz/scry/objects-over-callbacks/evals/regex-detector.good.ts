export interface Detector<Input, Output> {
	detect(input: Input): Output;
}

export class RegexDetector implements Detector<string, boolean> {
	constructor(private pattern: RegExp) {}

	detect(input: string): boolean {
		return this.pattern.test(input);
	}
}

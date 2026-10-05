export type Detector<Input, Output> = (input: Input) => Output;

export class Scanner {
	constructor(private detect: Detector<string, boolean>) {}
}

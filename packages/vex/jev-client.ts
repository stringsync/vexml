/** The pinned model and question revision make corpus measurements comparable. */
export const JEV_MODEL = 'jev-1.14.0';
export const JEV_QUESTIONS = 'musicxml-v1';

export interface JevRequest {
	images: Record<string, Buffer>;
	questions: Record<string, string>;
}

/** Probabilities of yes, keyed by question; unavailable credentials skip the stage. */
export interface JevClient {
	available(): Promise<boolean>;
	ask(request: JevRequest): Promise<Record<string, number>>;
}

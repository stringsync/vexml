export type JobId = string;

export interface JobScheduler {
	schedule(name: string, at: Date, run: () => Promise<void>): JobId;
	cancel(id: JobId): void;
	pending(): JobId[];
}

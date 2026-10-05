export type Notifier = (message: string) => Promise<void>;

export const slackNotifier: Notifier = async (message) => {
	await fetch(process.env.SLACK_WEBHOOK_URL!, {
		method: "POST",
		body: JSON.stringify({ text: message }),
	});
};

export const consoleNotifier: Notifier = async (message) => {
	console.warn(`[alert] ${message}`);
};

export class AlertService {
	constructor(private readonly notify: Notifier) {}

	async diskLow(host: string, percentFree: number): Promise<void> {
		if (percentFree < 10) await this.notify(`${host} has ${percentFree}% disk free`);
	}
}

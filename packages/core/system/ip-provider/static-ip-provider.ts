import type { IpProvider } from "./ip-provider";

export class StaticIpProvider implements IpProvider {
	constructor(private readonly ip: string) {}

	static localhost(): StaticIpProvider {
		return new StaticIpProvider("0.0.0.0");
	}

	static empty(): StaticIpProvider {
		return new StaticIpProvider("");
	}

	async get(): Promise<string> {
		return this.ip;
	}
}

import { NodePs } from "../ps/node-ps";
import type { Ps } from "../ps/ps";
import type { IpProvider, IpProviderOptions } from "./ip-provider";

export class LinuxIpProvider implements IpProvider {
	private readonly ps: Ps;

	constructor(opts: IpProviderOptions = {}) {
		this.ps = opts.ps ?? new NodePs();
		if (this.ps.platform !== "linux") {
			throw new Error("LinuxIpProvider is only supported on Linux");
		}
	}

	async get(): Promise<string> {
		const result = await this.ps.spawnCapture(["hostname", "-I"]);
		if (result.exitCode !== 0) {
			throw new Error("failed to get IP address");
		}

		const ip = result.stdout.trim().split(/\s+/)[0];
		if (!ip) {
			throw new Error("no IP address found");
		}

		return ip;
	}
}

import { NodePs } from "../ps/node-ps";
import type { Ps } from "../ps/ps";
import type { IpProvider, IpProviderOptions } from "./ip-provider";

export class DarwinIpProvider implements IpProvider {
	private readonly ps: Ps;

	constructor(opts: IpProviderOptions = {}) {
		this.ps = opts.ps ?? new NodePs();
		if (this.ps.platform !== "darwin") {
			throw new Error("DarwinIpProvider is only supported on macOS");
		}
	}

	async get(): Promise<string> {
		const result = await this.ps.spawnCapture(["ipconfig", "getifaddr", "en0"]);
		if (result.exitCode !== 0) {
			throw new Error("failed to get IP address from en0");
		}

		const ip = result.stdout.trim();
		if (!ip) {
			throw new Error("no IP address found on en0");
		}

		return ip;
	}
}

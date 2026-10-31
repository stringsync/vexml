import { NodePs } from "../ps/node-ps";
import type { Ps } from "../ps/ps";
import type { IpProvider, IpProviderOptions } from "./ip-provider";

export class Win32IpProvider implements IpProvider {
	private readonly ps: Ps;

	constructor(opts: IpProviderOptions = {}) {
		this.ps = opts.ps ?? new NodePs();
		if (this.ps.platform !== "win32") {
			throw new Error("Win32IpProvider is only supported on Windows");
		}
	}

	async get(): Promise<string> {
		const result = await this.ps.spawnCapture([
			"powershell",
			"-Command",
			"(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress",
		]);
		if (result.exitCode !== 0) {
			throw new Error("failed to get IP address");
		}

		const ip = result.stdout.trim();
		if (!ip) {
			throw new Error("no IP address found");
		}

		return ip;
	}
}

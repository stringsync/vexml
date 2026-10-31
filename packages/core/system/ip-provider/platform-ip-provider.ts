import { NodePs } from "../ps/node-ps";
import { DarwinIpProvider } from "./darwin-ip-provider";
import type { IpProvider, IpProviderOptions } from "./ip-provider";
import { LinuxIpProvider } from "./linux-ip-provider";
import { Win32IpProvider } from "./win32-ip-provider";

export class PlatformIpProvider implements IpProvider {
	private readonly provider: IpProvider;

	constructor(opts: IpProviderOptions = {}) {
		const ps = opts.ps ?? new NodePs();
		switch (ps.platform) {
			case "darwin":
				this.provider = new DarwinIpProvider({ ps });
				break;
			case "linux":
				this.provider = new LinuxIpProvider({ ps });
				break;
			case "win32":
				this.provider = new Win32IpProvider({ ps });
				break;
			default:
				throw new Error(`Unsupported platform: ${ps.platform}`);
		}
	}

	get(): Promise<string> {
		return this.provider.get();
	}
}

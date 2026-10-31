import { disposables, type Resource } from "core/disposable";
import type { Duration } from "../duration";
import type { Timer } from "./timer";

export class SystemTimer implements Timer {
	setTimeout(callback: () => void, delay: Duration): Resource {
		const id = setTimeout(callback, delay.ms);
		return disposables.callback(() => clearTimeout(id));
	}

	setInterval(callback: () => void, interval: Duration): Resource {
		const id = setInterval(callback, interval.ms);
		return disposables.callback(() => clearInterval(id));
	}
}

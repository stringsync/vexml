import { type Resource } from "../../disposable/index.js";
import type { Duration } from "../duration.js";
import type { Timer } from "./timer.js";
export declare class SystemTimer implements Timer {
    setTimeout(callback: () => void, delay: Duration): Resource;
    setInterval(callback: () => void, interval: Duration): Resource;
}

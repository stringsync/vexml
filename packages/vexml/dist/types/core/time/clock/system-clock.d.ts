import { Duration } from "../duration.js";
import type { Clock } from "./clock.js";
export declare class SystemClock implements Clock {
    now(): Duration;
}

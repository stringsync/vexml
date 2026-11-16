import { type Resource } from '../core/disposable/index.js';
import type { IdleScheduler, IdleSlice } from './idle-scheduler.js';
export declare class BrowserIdleScheduler implements IdleScheduler {
    request(slice: (budget: IdleSlice) => void): Resource;
}

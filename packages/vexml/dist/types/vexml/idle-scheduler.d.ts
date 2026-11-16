import type { Resource } from '../core/disposable/index.js';
export interface IdleSlice {
    timeRemaining(): number;
}
export interface IdleScheduler {
    request(slice: (budget: IdleSlice) => void): Resource;
}

import type { MDocument } from '@stringsync/mdom';
import type { Gap } from './config.js';
import type { Timeline } from './timeline.js';
export declare function readTimeline(input: string | Blob | MDocument, config?: {
    gaps?: Gap[];
}): Promise<Timeline>;

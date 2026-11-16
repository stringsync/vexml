import type { MDocument, Measure } from '@stringsync/mdom';
import type { GapPosition } from './config.js';
export declare function insertGaps(document: MDocument, positions: readonly GapPosition[]): Measure[];

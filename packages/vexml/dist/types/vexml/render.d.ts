import type { MDocument } from '@stringsync/mdom';
import { type ConfigInput } from './config.js';
import type { Score } from './score.js';
import type { ScoreSnapshot } from './score-snapshot.js';
export declare function render(input: string | Blob | MDocument | ScoreSnapshot, container: HTMLDivElement, config?: ConfigInput): Promise<Score>;

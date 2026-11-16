import { MDocument } from '@stringsync/mdom';
import type { ScoreParser } from './score-parser.js';
export declare class DefaultScoreParser implements ScoreParser {
    parse(input: string | Blob | MDocument): Promise<MDocument>;
}

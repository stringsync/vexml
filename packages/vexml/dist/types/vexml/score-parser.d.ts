import type { MDocument } from '@stringsync/mdom';
export interface ScoreParser {
    parse(input: string | Blob | MDocument): Promise<MDocument>;
}

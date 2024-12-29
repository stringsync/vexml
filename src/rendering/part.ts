import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { PartKey } from './types';

export class Part {
  constructor(private config: Config, private log: Logger, private document: Document, private key: PartKey) {}
}

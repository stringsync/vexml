import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { VoiceEntryKey } from './types';

export class Note {
  constructor(private config: Config, private log: Logger, private document: Document, private key: VoiceEntryKey) {}
}

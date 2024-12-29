import { Document } from './document';

export interface Formatter {
  format(): Document;
}

import * as fs from 'fs';
import * as path from 'path';
import { EXAMPLES } from '../examples';

export type Example = typeof EXAMPLES[keyof typeof EXAMPLES];

export const loadExample = (example: Example): string => {
  const fileName = path.join(__dirname, '..', 'examples', example);
  return fs.readFileSync(fileName, 'utf-8');
};

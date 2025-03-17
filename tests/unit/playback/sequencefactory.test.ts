import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { SequenceFactory } from '@/playback/sequencefactory';
import { NoopLogger } from '@/debug';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

// TODO: Create a mechanism for asserting the SequenceFactory output.

describe(SequenceFactory, () => {
  it('creates the correct sequence for a simple example', () => {
    expect(() => createSequences('playback_simple.musicxml')).not.toThrow();
  });
});

function createSequences(filename: string) {
  const musicXMLPath = path.resolve(DATA_DIR, filename);
  const musicXML = fs.readFileSync(musicXMLPath).toString();
  const div = document.createElement('div');
  const score = vexml.renderMusicXML(musicXML, div);
  const logger = new NoopLogger();
  const sequenceFactory = new SequenceFactory(logger, score);
  return sequenceFactory.create();
}

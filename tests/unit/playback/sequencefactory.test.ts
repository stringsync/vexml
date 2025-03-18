import * as vexml from '@/index';
import * as path from 'path';
import fs from 'fs';
import { SequenceFactory } from '@/playback/sequencefactory';
import { NoopLogger } from '@/debug';

const DATA_DIR = path.resolve(__dirname, '..', '..', '__data__', 'vexml');

describe(SequenceFactory, () => {
  const logger = new NoopLogger();

  it('creates for: single measure, single stave, different notes', () => {
    const score = render('playback_simple.musicxml');
    const factory = new SequenceFactory(logger, score);

    const sequences = factory.create();

    expect(sequences).toHaveLength(1);
  });

  it('creates for: single measure, single stave, same notes', () => {
    const score = render('playback_same_note.musicxml');
    const factory = new SequenceFactory(logger, score);

    const sequences = factory.create();

    expect(sequences).toHaveLength(1);
  });

  it('creates for: single measure, multiple staves, different notes', () => {
    const score = render('playback_multi_stave.musicxml');
    const factory = new SequenceFactory(logger, score);

    const sequences = factory.create();

    expect(sequences).toHaveLength(1);
  });

  it('creates for: single measure, multiple staves, multiple parts', () => {
    const score = render('playback_multi_part.musicxml');
    const factory = new SequenceFactory(logger, score);

    const sequences = factory.create();

    expect(sequences).toHaveLength(2);
  });

  it('creates for: multiple measures, single stave, different notes', () => {
    const score = render('playback_multi_measure.musicxml');
    const factory = new SequenceFactory(logger, score);

    const sequences = factory.create();

    expect(sequences).toHaveLength(1);
  });

  it('creates for: single measure, single stave, repeat', () => {
    const score = render('playback_repeat.musicxml');
    const factory = new SequenceFactory(logger, score);

    const sequences = factory.create();

    expect(sequences).toHaveLength(1);
  });

  it('creates for: multiple measures, single stave, repeat with endings', () => {
    const score = render('playback_repeat_endings.musicxml');
    const factory = new SequenceFactory(logger, score);

    const sequences = factory.create();

    expect(sequences).toHaveLength(1);
  });

  it('creates for: multiple measures, single stave, multiple systems', () => {
    const score = render('playback_multi_system.musicxml');
    const factory = new SequenceFactory(logger, score);

    const sequences = factory.create();

    expect(sequences).toHaveLength(1);
  });
});

function render(filename: string) {
  const musicXMLPath = path.resolve(DATA_DIR, filename);
  const musicXML = fs.readFileSync(musicXMLPath).toString();
  const div = document.createElement('div');
  return vexml.renderMusicXML(musicXML, div, {
    config: {
      WIDTH: 900,
    },
  });
}

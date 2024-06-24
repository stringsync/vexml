import { Rendering, Vexml } from '@/index';
import * as path from 'path';
import * as fs from 'fs';

const MUSICXML_PATH = path.join(__dirname, '__data__', 'vexml', 'events.musicxml');

describe('events', () => {
  let musicXML = '';
  const div = document.createElement('div');
  let rendering: Rendering;

  beforeAll(() => {
    musicXML = fs.readFileSync(MUSICXML_PATH, 'utf-8');
  });

  beforeEach(() => {
    rendering = Vexml.fromMusicXML(musicXML).render({ element: div, width: 400 });
    jest.useFakeTimers();
  });

  afterEach(() => {
    rendering.destroy();
    jest.useRealTimers();
  });

  it('emits click events', async () => {
    const click = jest.fn();

    rendering.addEventListener('click', click);
    rendering.dispatchNativeEvent(new MouseEvent('mousedown', { bubbles: false }));
    rendering.dispatchNativeEvent(new MouseEvent('mouseup', { bubbles: false }));

    expect(click).toHaveBeenCalled();
  });
});

import { Rendering, Vexml } from '@/index';
import * as path from 'path';
import * as fs from 'fs';

const MUSICXML_PATH = path.join(__dirname, '__data__', 'vexml', 'events.musicxml');

describe('events', () => {
  const div = document.createElement('div');
  let musicXML = '';
  let rendering: Rendering;

  beforeAll(() => {
    musicXML = fs.readFileSync(MUSICXML_PATH, 'utf-8');
  });

  beforeEach(() => {
    rendering = Vexml.fromMusicXML(musicXML).render({
      config: { INPUT_TYPE: 'hybrid' },
      element: div,
      width: 400,
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    rendering.destroy();
    jest.useRealTimers();
  });

  it('emits click events from mouse events', async () => {
    const callback = jest.fn();

    rendering.addEventListener('click', callback);
    rendering.dispatchNativeEvent(new MouseEvent('mousedown'));
    rendering.dispatchNativeEvent(new MouseEvent('mouseup'));

    expect(callback).toHaveBeenCalled();
  });

  it('emits longpress events from mouse events', async () => {
    const callback = jest.fn();

    rendering.addEventListener('longpress', callback);
    rendering.dispatchNativeEvent(new MouseEvent('mousedown'));
    jest.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalled();
  });

  // TODO: Add tests for the rest of the events when there's a mechanism to query where the bounding shapes are and the
  // events are finalized.
});

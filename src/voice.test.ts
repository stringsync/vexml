import * as vexflow from 'vexflow';
import { Voice } from './voice';

describe(Voice, () => {
  describe('getNumBeats', () => {
    it('returns the number of beats', () => {
      const voice = new Voice().setNumBeats(42);
      expect(voice.getNumBeats()).toBe(42);
    });
  });

  describe('setNumBeats', () => {
    it('sets the number of beats', () => {
      () => {
        const voice = new Voice().setNumBeats(42);
        expect(voice.getNumBeats()).toBe(42);
      };
    });
  });

  describe('getBeatValue', () => {
    it('returns the beat value', () => {
      const voice = new Voice().setBeatValue(42);
      expect(voice.getBeatValue()).toBe(42);
    });
  });

  describe('setBeatValue', () => {
    it('sets the beat value', () => {
      const voice = new Voice().setBeatValue(42);
      expect(voice.getBeatValue()).toBe(42);
    });
  });

  describe('getTickables', () => {
    it('returns the tickables', () => {
      const staveNote = new vexflow.StaveNote({
        keys: ['C/4'],
        duration: 'w',
      });
      const voice = new Voice().addTickables([staveNote]);

      const tickables = voice.getTickables();

      expect(tickables).toHaveLength(1);
      expect(tickables[0]).toBe(staveNote);
    });
  });

  describe('addTickables', () => {
    it('adds the tickables', () => {
      const staveNote = new vexflow.StaveNote({
        keys: ['C/4'],
        duration: 'w',
      });
      const voice = new Voice().addTickables([staveNote]);

      const tickables = voice.getTickables();

      expect(tickables).toHaveLength(1);
      expect(tickables[0]).toBe(staveNote);
    });
  });

  describe('toVexflow', () => {
    it('transforms to a vexflow.Voice', () => {
      const staveNote = new vexflow.StaveNote({
        keys: ['C/4'],
        duration: 'w',
      });
      const voice = new Voice().setNumBeats(6).setBeatValue(8).addTickables([staveNote]);

      const vfVoice = voice.toVexflow();

      const tickables = vfVoice.getTickables();
      expect(tickables).toHaveLength(1);
      expect(tickables[0]).toBe(staveNote);
    });
  });
});

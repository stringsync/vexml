import * as vexflow from 'vexflow';
import { Voice } from '@/voice';
import { TimeSignature } from '@/timesignature';

describe(Voice, () => {
  describe('getTimeSignature', () => {
    it('returns the time signature', () => {
      const timeSignature = new TimeSignature(6, 8);
      const voice = new Voice().setTimeSignature(timeSignature);
      expect(voice.getTimeSignature()).toBe(timeSignature);
    });
  });

  describe('setTimeSignature', () => {
    it('sets the time signature', () => {
      () => {
        const timeSignature = new TimeSignature(6, 8);
        const voice = new Voice().setTimeSignature(timeSignature);
        expect(voice.getTimeSignature()).toBe(timeSignature);
      };
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
      const voice = new Voice().setTimeSignature(new TimeSignature(6, 8)).addTickables([staveNote]);

      const vfVoice = voice.toVexflow();

      const tickables = vfVoice.getTickables();
      expect(tickables).toHaveLength(1);
      expect(tickables[0]).toBe(staveNote);
    });
  });
});

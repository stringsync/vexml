import * as vexflow from 'vexflow';
import { Stave } from './stave';
import { Voice } from './voice';

describe(Stave, () => {
  describe('clone', () => {
    it('clones the stave', () => {
      const stave1 = new Stave();
      const stave2 = stave1.clone();

      expect(stave1).toStrictEqual(stave2);
      expect(stave1).not.toBe(stave2);
    });
  });

  describe('getX', () => {
    it('returns X', () => {
      const stave = new Stave().setX(42);
      expect(stave.getX()).toBe(42);
    });
  });

  describe('setX', () => {
    it('sets X', () => {
      const stave = new Stave().setX(42);
      expect(stave.getX()).toBe(42);
    });
  });

  describe('getY', () => {
    it('returns Y', () => {
      const stave = new Stave().setY(42);
      expect(stave.getY()).toBe(42);
    });
  });

  describe('setY', () => {
    it('sets Y', () => {
      const stave = new Stave().setY(42);
      expect(stave.getY()).toBe(42);
    });
  });

  describe('getWidth', () => {
    it('returns the width', () => {
      const stave = new Stave().setWidth(42);
      expect(stave.getWidth()).toBe(42);
    });
  });

  describe('setWidth', () => {
    it('sets the width', () => {
      const stave = new Stave().setWidth(42);
      expect(stave.getWidth()).toBe(42);
    });
  });

  describe('addWidth', () => {
    it('adds to the width', () => {
      const stave = new Stave().setWidth(42).addWidth(42);
      expect(stave.getWidth()).toBe(84);
    });
  });

  describe('getJustifyWidth', () => {
    it('calculates the justify width using the voice', () => {
      const voice = new Voice().addTickables([
        new vexflow.StaveNote({
          keys: ['C/4'],
          duration: '4',
        }),
      ]);
      const stave = new Stave().setVoice(voice);

      expect(stave.getJustifyWidth()).toBeWithin(13, 14);
    });

    it('returns 0 when the voice is undefined', () => {
      const stave = new Stave();
      expect(stave.getJustifyWidth()).toBe(0);
    });
  });

  describe('getModifiersWidth', () => {
    it('returns the modifiers width', () => {
      const stave = new Stave().setClef('treble');
      expect(stave.getModifiersWidth()).toBeWithin(29, 30);
    });
  });

  describe('getNoteStartX', () => {
    it('returns the noteStartX', () => {
      const stave = new Stave();
      expect(stave.getNoteStartX()).toBe(5);
    });
  });

  describe('getClef', () => {
    it('returns the clef', () => {
      const stave = new Stave().setClef('alto');
      expect(stave.getClef()).toBe('alto');
    });
  });

  describe('setClef', () => {
    it('sets the clef', () => {
      const stave = new Stave().setClef('alto');
      expect(stave.getClef()).toBe('alto');
    });
  });

  describe('getTimeSignature', () => {
    it('returns the time signature', () => {
      const stave = new Stave().setTimeSignature('4/4');
      expect(stave.getTimeSignature()).toBe('4/4');
    });
  });

  describe('setTimeSignature', () => {
    it('sets the time signature', () => {
      const stave = new Stave().setTimeSignature('4/4');
      expect(stave.getTimeSignature()).toBe('4/4');
    });
  });

  describe('getBeginningBarStyle', () => {
    it('returns the beginning bar style', () => {
      const stave = new Stave().setBeginningBarStyle('dashed');
      expect(stave.getBeginningBarStyle()).toBe('dashed');
    });
  });

  describe('setBeginningBarStyle', () => {
    it('sets the beginning bar style', () => {
      const stave = new Stave().setBeginningBarStyle('dashed');
      expect(stave.getBeginningBarStyle()).toBe('dashed');
    });
  });

  describe('getEndBarStyle', () => {
    it('returns the end bar style', () => {
      const stave = new Stave().setEndBarStyle('dashed');
      expect(stave.getEndBarStyle()).toBe('dashed');
    });
  });

  describe('setEndBarStyle', () => {
    it('sets the end bar style', () => {
      const stave = new Stave().setEndBarStyle('dashed');
      expect(stave.getEndBarStyle()).toBe('dashed');
    });
  });

  describe('getVoice', () => {
    it('returns the voice', () => {
      const voice = new Voice();
      const stave = new Stave().setVoice(voice);
      expect(stave.getVoice()).toBe(voice);
    });
  });

  describe('setVoice', () => {
    it('sets the voice', () => {
      const voice = new Voice();
      const stave = new Stave().setVoice(voice);
      expect(stave.getVoice()).toBe(voice);
    });
  });

  describe('toVexflow', () => {
    it('transforms to a vexflow.Stave', () => {
      const stave = new Stave()
        .setX(42)
        .setY(43)
        .setWidth(44)
        .setClef('treble')
        .setTimeSignature('6/8')
        .setBeginningBarStyle('regular')
        .setEndBarStyle('tick');

      const vfStave = stave.toVexflow();

      expect(vfStave.getX()).toBe(42);
      expect(vfStave.getY()).toBe(43);
      expect(vfStave.getWidth()).toBe(44);
      expect(vfStave.getClef()).toBe('treble');
    });
  });
});

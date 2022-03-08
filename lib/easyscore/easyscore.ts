import Vex from 'vexflow';

export const easyscore = (elementId: string) => {
  const f = new Vex.Flow.Factory({
    renderer: { elementId, width: 500, height: 200 },
  });

  const score = f.EasyScore();
  const system = f.System();

  system
    .addStave({
      voices: [
        score.voice(score.notes('C#5/q, B4, A4, G#4', { stem: 'up' })),
      ],
    })
    .addClef('treble')
    .addTimeSignature('4/4');

  f.draw();
};

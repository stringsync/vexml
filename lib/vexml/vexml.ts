import { EasyScore } from 'vexflow';
import { EasyScoreMessageRenderer } from './EasyScoreMessageRenderer';

export const vexml = (elementId: string) => {
  EasyScoreMessageRenderer.render(
    elementId,
    './example.xml is the MusicXML string that would be used here'
  );
};

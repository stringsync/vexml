import { EasyScore } from "vexflow";
import { EasyScoreMessageRenderer } from "./EasyScoreMessageRenderer";

export const vexml = (elementId: string) => {
  EasyScoreMessageRenderer.render(elementId, 'see ./example.xml');
};

import { EasyScore } from "vexflow";

export const vexml = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerText = 'TODO';
  }
};

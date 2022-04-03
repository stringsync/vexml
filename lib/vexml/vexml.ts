import { EasyScoreMessageRenderer } from './EasyScoreMessageRenderer';

export const load = (file: Blob, elementId: string) => {
  const reader = new FileReader();
  reader.onload = (event: ProgressEvent<FileReader>) => {
    const xmlString = event?.target?.result?.toString();
    if (xmlString) {
      const parser: DOMParser = new DOMParser();
      const xml = parser.parseFromString(xmlString, 'application/xml');
      EasyScoreMessageRenderer.render(elementId, xml);
    }
  };
  reader.readAsBinaryString(file);
};

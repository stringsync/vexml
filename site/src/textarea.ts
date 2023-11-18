import { $ } from './helpers';

export class TextArea {
  static id(id: string): TextArea {
    return new TextArea($(id, HTMLTextAreaElement));
  }

  constructor(private textArea: HTMLTextAreaElement) {}

  onChange(callback: (text: string) => void) {
    this.textArea.addEventListener('change', () => {
      callback(this.textArea.value);
    });
  }
}

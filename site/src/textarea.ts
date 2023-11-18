import { getById } from './helpers';

export class TextArea {
  static id(id: string): TextArea {
    return new TextArea(getById(id, HTMLTextAreaElement));
  }

  constructor(private textArea: HTMLTextAreaElement) {}

  onChange(callback: (text: string) => void) {
    this.textArea.addEventListener('input', () => {
      callback(this.textArea.value);
    });
  }

  setText(text: string): this {
    this.textArea.value = text;
    return this;
  }
}

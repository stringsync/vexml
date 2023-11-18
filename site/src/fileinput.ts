import { getById } from './helpers';

export class FileInput {
  static id(id: string): FileInput {
    return new FileInput(getById(id, HTMLInputElement));
  }

  constructor(private input: HTMLInputElement) {}

  onChange(callback: (text: string) => void) {
    this.input.addEventListener('change', () => {
      const files = this.input.files;
      if (!files || files.length === 0) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          callback(text);
        }
      };
      reader.readAsText(files[0]);
    });
  }
}

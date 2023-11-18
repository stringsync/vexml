import { $ } from './helpers';

export class Checkbox {
  static id(id: string): Checkbox {
    return new Checkbox($(id, HTMLInputElement));
  }

  constructor(private checkbox: HTMLInputElement) {}

  onChange(callback: (isChecked: boolean) => void) {
    this.checkbox.addEventListener('change', () => {
      callback(this.isChecked());
    });
  }

  isChecked(): boolean {
    return this.checkbox.checked;
  }
}

import { $ } from './helpers';

export class Checkbox {
  static id(id: string): Checkbox {
    return new Checkbox($(id, HTMLInputElement));
  }

  constructor(private checkbox: HTMLInputElement) {}

  onChange(callback: () => void) {
    this.checkbox.addEventListener('change', (event) => {
      event.target;
    });
  }

  isChecked(): boolean {
    return this.checkbox.checked;
  }
}

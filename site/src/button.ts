import { getById } from './helpers';

export class Button {
  static id(id: string): Button {
    return new Button(getById(id, HTMLButtonElement));
  }

  constructor(private button: HTMLButtonElement) {}

  onClick(callback: () => void) {
    this.button.addEventListener('click', () => {
      callback();
    });
  }

  enable(): this {
    this.button.removeAttribute('disabled');
    return this;
  }

  disable(): this {
    this.button.setAttribute('disabled', '');
    return this;
  }
}

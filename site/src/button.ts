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

  show(): this {
    this.button.classList.remove('d-none');
    return this;
  }

  hide(): this {
    this.button.classList.add('d-none');
    return this;
  }
}

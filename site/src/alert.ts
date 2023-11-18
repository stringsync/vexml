import { getById } from './helpers';

export class Alert {
  static id(id: string): Alert {
    return new Alert(getById(id, HTMLDivElement));
  }

  constructor(private div: HTMLDivElement) {}

  danger(): this {
    this.div.classList.remove('alert-secondary');
    this.div.classList.add('alert-danger');
    return this;
  }

  info(): this {
    this.div.classList.remove('alert-danger');
    this.div.classList.add('alert-secondary');
    return this;
  }

  text(text: string): this {
    this.div.innerText = text;
    return this;
  }
}

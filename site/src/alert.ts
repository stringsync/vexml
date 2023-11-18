import { $ } from './helpers';

export class Alert {
  static id(id: string): Alert {
    return new Alert($(id, HTMLDivElement));
  }

  constructor(private div: HTMLDivElement) {}

  danger(): this {
    this.div.classList.remove('alert-primary');
    this.div.classList.add('alert-danger');
    return this;
  }

  info(): this {
    this.div.classList.remove('alert-danger');
    this.div.classList.add('alert-primary');
    return this;
  }

  text(text: string): this {
    this.div.innerText = text;
    return this;
  }

  show(): this {
    this.div.classList.remove('d-none');
    return this;
  }

  hide(): this {
    this.div.classList.add('d-none');
    return this;
  }
}

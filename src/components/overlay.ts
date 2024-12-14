/** A component that covers a parent component. */
export class Overlay {
  private element: HTMLDivElement;

  private constructor(element: HTMLDivElement) {
    this.element = element;
  }

  static render(parent: HTMLElement) {
    const element = document.createElement('div');
    element.classList.add('vexml-overlay');
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.left = '0';
    element.style.width = '100%';
    element.style.height = '100%';

    parent.append(element);

    return new Overlay(element);
  }

  getElement(): HTMLDivElement {
    return this.element;
  }
}

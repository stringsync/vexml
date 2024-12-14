import * as spatial from '@/spatial';

export class Scroller {
  constructor(private scrollContainer: HTMLElement) {}

  isFullyVisible(rect: spatial.Rect): boolean {
    const visibleRect = this.getVisibleRect();
    return (
      rect.x >= visibleRect.x &&
      rect.y >= visibleRect.y &&
      rect.x + rect.w <= visibleRect.x + visibleRect.w &&
      rect.y + rect.h <= visibleRect.y + visibleRect.h
    );
  }

  scrollTo(point: spatial.Point) {
    if (this.scrollContainer.scrollLeft !== point.x || this.scrollContainer.scrollTop !== point.y) {
      this.scrollContainer.scrollTo({
        top: point.y,
        left: point.x,
        behavior: 'smooth',
      });
    }
  }

  private getVisibleRect(): spatial.Rect {
    const scrollLeft = this.scrollContainer.scrollLeft;
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollWidth = this.scrollContainer.clientWidth;
    const scrollHeight = this.scrollContainer.clientHeight;
    return new spatial.Rect(scrollLeft, scrollTop, scrollWidth, scrollHeight);
  }
}

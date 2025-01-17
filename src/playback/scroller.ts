import * as spatial from '@/spatial';

const SCROLLER_HORIZONTAL_PADDING = 20;
const SCROLLER_VERTICAL_PADDING = 20;

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

  scrollTo(position: spatial.Point, behavior: ScrollBehavior = 'auto') {
    if (!this.isAt(position)) {
      this.scrollContainer.scrollTo({
        top: position.y - SCROLLER_VERTICAL_PADDING,
        left: position.x - SCROLLER_HORIZONTAL_PADDING,
        behavior,
      });
    }
  }

  private isAt(position: spatial.Point): boolean {
    return this.scrollContainer.scrollLeft === position.x && this.scrollContainer.scrollTop === position.y;
  }

  private getVisibleRect(): spatial.Rect {
    const scrollLeft = this.scrollContainer.scrollLeft;
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollWidth = this.scrollContainer.clientWidth;
    const scrollHeight = this.scrollContainer.clientHeight;
    return new spatial.Rect(scrollLeft, scrollTop, scrollWidth, scrollHeight);
  }
}

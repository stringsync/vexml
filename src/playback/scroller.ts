import * as spatial from '@/spatial';

const SCROLLER_HORIZONTAL_PADDING = 20;
const SCROLLER_VERTICAL_PADDING = 20;

// Default upper bound for waiting on a smooth scroll to settle. Guards against the 'scrollend'
// event never firing, e.g. an unsupported browser or a scroll that became a no-op after the
// target was clamped to the container's scroll bounds. Overridable per call via `opts.timeoutMs`.
const DEFAULT_SCROLL_TIMEOUT_MS = 1000;

/** How a {@link Scroller.scrollTo} promise settled. */
export type ScrollResult =
  // The 'scrollend' event fired: the scroll reached its target.
  | 'completed'
  // A newer scroll superseded this one before it could finish.
  | 'interrupted'
  // The scroll did not settle within the allotted time.
  | 'timeout';

const noop = (): void => {};

export class Scroller {
  // Settles the smooth scroll currently in flight as interrupted. `noop` when nothing is pending.
  private interruptPending: () => void = noop;

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

  /**
   * Scrolls the container to the given position.
   *
   * For smooth scrolls, the returned promise resolves once the scroll settles (`'completed'`), is
   * superseded by a newer scroll (`'interrupted'`), or exceeds `opts.timeoutMs` (`'timeout'`).
   * Non-smooth scrolls apply synchronously and always resolve `'completed'`.
   */
  scrollTo(
    position: spatial.Point,
    behavior: ScrollBehavior = 'auto',
    opts: { timeoutMs?: number } = {}
  ): Promise<ScrollResult> {
    if (this.isAt(position)) {
      return Promise.resolve('completed');
    }

    const top = position.y - SCROLLER_VERTICAL_PADDING;
    const left = position.x - SCROLLER_HORIZONTAL_PADDING;

    // Any new scroll supersedes a smooth scroll that is still in flight.
    this.interruptPending();

    // Non-smooth scrolls are applied synchronously, so there's nothing to wait for.
    if (behavior !== 'smooth') {
      this.scrollContainer.scrollTo({ top, left, behavior });
      return Promise.resolve('completed');
    }

    const timeoutMs = opts.timeoutMs ?? DEFAULT_SCROLL_TIMEOUT_MS;

    return new Promise<ScrollResult>((resolve) => {
      // Aborting removes the 'scrollend' listener regardless of which path settles the promise.
      const controller = new AbortController();
      let timeout = 0;

      const settle = (result: ScrollResult): void => {
        window.clearTimeout(timeout);
        controller.abort();
        this.interruptPending = noop;
        resolve(result);
      };

      // Expose this scroll's interrupt hook so the next scrollTo can supersede it.
      this.interruptPending = (): void => settle('interrupted');

      this.scrollContainer.addEventListener('scrollend', () => settle('completed'), {
        once: true,
        signal: controller.signal,
      });
      timeout = window.setTimeout(() => settle('timeout'), timeoutMs);

      this.scrollContainer.scrollTo({ top, left, behavior });
    });
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

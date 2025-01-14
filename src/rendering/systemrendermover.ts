import * as util from '@/util';
import { Rect } from '@/spatial';
import { SystemRender } from './types';

type Movable = {
  rect: Rect;
};

type HasIntrinsicRect = {
  intrinsicRect: Rect;
};

/**
 * After a system is rendered, we may learn there is excess height from its components. This class recursivley moves
 * all the rects by the excess height such that we can honor the SYSTEM_MARGIN_BOTTOM configuration without
 * re-rendering. This is much faster than re-rendering the system at a different position.
 */
export class SystemRenderMover {
  moveBy(systemRender: SystemRender, dy: number) {
    const seen = new Set<any>(); // avoid circular references

    const move = (obj: any) => {
      if (seen.has(obj)) {
        return;
      }
      seen.add(obj);
      if (this.isMovable(obj)) {
        obj.rect = obj.rect.translate({ dy });
      }
      if (this.hasIntrinsicRect(obj)) {
        obj.intrinsicRect = obj.intrinsicRect.translate({ dy });
      }
      if (Array.isArray(obj)) {
        for (const item of obj) {
          move(item);
        }
      } else if (util.isPOJO(obj)) {
        for (const key in obj) {
          move(obj[key]);
        }
      }
    };
    move(systemRender);

    // Before finishing, we move the vexflow staves. Since everything is linked to them, this should complete the move.
    // Any future supported vexflow object not connected to a stave will need to be moved here.
    systemRender.measureRenders
      .flatMap((m) => m.fragmentRenders)
      .flatMap((e) => e.partRenders)
      .flatMap((p) => p.staveRenders)
      .map((s) => s.vexflowStave)
      .forEach((s) => {
        s.setY(s.getY() + dy);
      });
  }

  private isMovable(obj: any): obj is Movable {
    return !!obj && obj.rect instanceof Rect;
  }

  private hasIntrinsicRect(obj: any): obj is HasIntrinsicRect {
    return !!obj && obj.intrinsicRect instanceof Rect;
  }
}

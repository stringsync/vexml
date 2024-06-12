import * as spatial from '@/spatial';

export class InteractionModel<T> {
  private handles: InteractionHandle[];
  private value: T;

  constructor(handles: InteractionHandle[], value: T) {
    this.handles = handles;
    this.value = value;
  }

  getNearestHandle(point: spatial.Point): InteractionHandle {
    throw new Error('Not implemented');
  }

  getHandlesContaining(point: spatial.Point): InteractionHandle[] {
    throw new Error('Not implemented');
  }
}

export class InteractionHandle {
  private shape: spatial.Shape;
  // TODO(jared): Add type data such as 'DRAG', 'ROTATE', 'SCALE', etc.
  private type: string = 'unknown';

  constructor(shape: spatial.Shape) {
    this.shape = shape;
  }
}

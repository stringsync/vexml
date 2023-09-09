type DistanceGetter = () => number;

export class Size {
  static zero(): Size {
    return Size.absolute(0, 0);
  }

  static absolute(w: number, h: number): Size {
    return new Size(
      () => w,
      () => h
    );
  }

  public readonly getW: DistanceGetter;
  public readonly getH: DistanceGetter;

  private constructor(getW: DistanceGetter, getH: DistanceGetter) {
    this.getW = getW;
    this.getH = getH;
  }
}

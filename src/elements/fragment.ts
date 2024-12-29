import * as util from '@/util';
import * as spatial from '@/spatial';

export class Fragment {
  @util.memoize()
  getRect(): spatial.Rect {
    return new spatial.Rect(0, 0, 100, 50);
  }
}

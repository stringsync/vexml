import * as rendering from '@/rendering';

export type InteractionModelType = Exclude<
  rendering.InteractionModelType,
  rendering.InteractionModel<rendering.MeasureRendering>
>;

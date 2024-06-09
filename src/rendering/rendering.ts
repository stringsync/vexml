import { Topic, Callback } from '@/events';
import { ScoreRendering } from './score';

export type RenderingEvents = {
  click: undefined;
};

export class Rendering {
  private score: ScoreRendering;
  private topic = new Topic<RenderingEvents>();

  constructor(score: ScoreRendering) {
    this.score = score;
  }

  addEventListener<N extends keyof RenderingEvents>(name: N, callback: Callback<RenderingEvents[N]>): number {
    return this.topic.subscribe(name, callback);
  }

  removeEventListener(id: number): void {
    this.topic.unsubscribe(id);
  }
}

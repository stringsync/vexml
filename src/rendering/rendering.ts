import { Topic, Callback } from '@/events';
import { ScoreRendering } from './score';

export type RenderingEvents = {
  click: { src: Event };
};

export class Rendering {
  private score: ScoreRendering;
  private topic = new Topic<RenderingEvents>();
  private installed = false;

  constructor(score: ScoreRendering) {
    this.score = score;
  }

  addEventListener<N extends keyof RenderingEvents>(name: N, callback: Callback<RenderingEvents[N]>): number {
    this.install();
    return this.topic.subscribe(name, callback);
  }

  removeEventListener(id: number): void {
    this.topic.unsubscribe(id);
    if (this.topic.getSubscriberCount() === 0) {
      this.uninstall();
    }
  }

  private install() {
    if (!this.installed) {
      this.score.container.addEventListener('click', this.onNativeClick);
      this.installed = true;
    }
  }

  private uninstall() {
    if (this.installed) {
      this.score.container.removeEventListener('click', this.onNativeClick);
      this.installed = false;
    }
  }

  private onNativeClick = (e: Event) => {
    this.topic.publish('click', { src: e });
  };
}

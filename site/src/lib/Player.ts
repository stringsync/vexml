export type PlayerState = 'playing' | 'paused';

export type PlayerEventMap = {
  progress: number;
  statechange: PlayerState;
};

export type PlayerEventCallback<K extends keyof PlayerEventMap> = (event: PlayerEventMap[K]) => void;

type Listener<K extends keyof PlayerEventMap> = {
  id: number;
  name: K;
  callback: PlayerEventCallback<K>;
};

/** A player driven by requestAnimationFrame. */
export class Player {
  private state: PlayerState = 'paused';
  private currentTimeMs = 0;
  private lastFrameMs = -1;
  private handle = -1;
  private nextListenerId = 1;
  private suspendCount = 0;
  private listeners = new Array<Listener<any>>();
  private preSuspendState: PlayerState = 'paused';

  constructor(private readonly durationMs: number) {}

  getState(): PlayerState {
    return this.state;
  }

  addEventListener<K extends keyof PlayerEventMap>(name: K, callback: PlayerEventCallback<K>): number {
    const id = this.nextListenerId++;
    this.listeners.push({ id, name, callback });
    return id;
  }

  removeEventListener(...ids: number[]) {
    this.listeners = this.listeners.filter((listener) => !ids.includes(listener.id));
  }

  play() {
    if (this.state === 'playing') {
      return;
    }
    this.state = 'playing';
    this.lastFrameMs = performance.now();
    this.raf();
    this.broadcastStateChange();
  }

  pause() {
    if (this.state === 'paused') {
      return;
    }
    this.state = 'paused';
    cancelAnimationFrame(this.handle);
    this.broadcastStateChange();
  }

  suspend() {
    if (this.suspendCount === 0) {
      this.preSuspendState = this.state;
    }
    this.pause();
    this.suspendCount++;
  }

  unsuspend() {
    this.suspendCount = Math.max(0, this.suspendCount - 1);

    if (this.isSuspended()) {
      return;
    }

    if (this.preSuspendState === 'playing') {
      this.play();
    } else {
      this.pause();
    }
  }

  seek(timeMs: number) {
    this.currentTimeMs = timeMs;
  }

  reset() {
    this.pause();
    this.currentTimeMs = 0;
    this.suspendCount = 0;
    this.listeners = [];
  }

  private raf() {
    const now = performance.now();
    const deltaMs = now - this.lastFrameMs;
    this.lastFrameMs = now;

    if (this.isSuspended()) {
      requestAnimationFrame(() => this.raf());
      return;
    }

    this.currentTimeMs += deltaMs;

    this.broadcastProgress();

    if (this.currentTimeMs >= this.durationMs) {
      this.pause();
    } else {
      this.handle = requestAnimationFrame(() => this.raf());
    }
  }

  private isSuspended() {
    return this.suspendCount > 0;
  }

  private broadcastProgress() {
    const listeners = this.listeners.filter(
      (listener): listener is Listener<'progress'> => listener.name === 'progress'
    );

    for (const listener of listeners) {
      listener.callback(this.currentTimeMs);
    }
  }

  private broadcastStateChange() {
    const listeners = this.listeners.filter(
      (listener): listener is Listener<'statechange'> => listener.name === 'statechange'
    );

    for (const listener of listeners) {
      listener.callback(this.state);
    }
  }
}

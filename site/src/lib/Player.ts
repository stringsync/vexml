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

export class Player {
  private state: PlayerState = 'paused';
  private currentTimeMs = 0;
  private lastFrameMs = -1;
  private handle = -1;
  private nextListenerId = 1;
  private listeners = new Array<Listener<any>>();
  private preDragState: PlayerState = 'paused';
  private isDragging = false;

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
    if (this.state === 'paused') {
      this.state = 'playing';
      this.lastFrameMs = performance.now();
      this.raf();
      this.broadcastStateChange();
    }
  }

  pause() {
    this.state = 'paused';
    cancelAnimationFrame(this.handle);
    this.broadcastStateChange();
  }

  startDrag() {
    this.preDragState = this.state;
    this.pause();
    this.isDragging = true;
  }

  stopDrag() {
    this.isDragging = false;
    if (this.preDragState === 'playing') {
      this.play();
    } else {
      this.pause();
    }
  }

  seek(timeMs: number) {
    this.currentTimeMs = timeMs;
    this.broadcastProgress();
  }

  private raf() {
    if (this.isDragging) {
      requestAnimationFrame(() => this.raf());
      return;
    }

    const now = performance.now();
    const deltaMs = now - this.lastFrameMs;
    this.lastFrameMs = now;
    this.currentTimeMs += deltaMs;

    this.broadcastProgress();

    if (this.currentTimeMs >= this.durationMs) {
      this.pause();
    } else {
      this.handle = requestAnimationFrame(() => this.raf());
    }
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

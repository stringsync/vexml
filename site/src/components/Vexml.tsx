import * as vexml from '@/index';
import * as errors from '../util/errors';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWidth } from '../hooks/useWidth';
import { Player, PlayerState } from '../lib/Player';
import { getDevice } from '../util/getDevice';

const STRINGSYNC_RED = '#FC354C';

export type VexmlProps = {
  musicXML: string;
  backend: 'svg' | 'canvas';
  config: vexml.Config;
  onResult: (result: VexmlResult) => void;
  onClick?: vexml.ClickEventListener;
  onLongpress?: vexml.LongpressEventListener;
  onEnter?: vexml.EnterEventListener;
  onExit?: vexml.ExitEventListener;
  onScroll?: vexml.ScrollEventListener;
};

export type VexmlResult =
  | { type: 'none' }
  | { type: 'empty' }
  | { type: 'success'; start: Date; end: Date; width: number; element: HTMLCanvasElement | SVGElement }
  | { type: 'error'; error: Error; start: Date; end: Date; width: number };

export const Vexml = ({
  musicXML,
  backend,
  config,
  onResult,
  onClick,
  onLongpress,
  onEnter,
  onExit,
  onScroll,
}: VexmlProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const div = divRef.current;

  const width = useWidth(divRef);

  const device = useMemo(getDevice, []);
  const scrollBehavior: ScrollBehavior = device.inputType === 'mouseonly' ? 'smooth' : 'auto';

  const [score, setScore] = useState<vexml.Score | null>(null);
  const [cursor, setCursor] = useState<vexml.Cursor | null>(null);

  const [progress, setProgress] = useState(0);

  const durationMs = score?.getDurationMs() ?? 0;
  const elapsedMs = progress * durationMs;
  const remainingMs = Math.max(0, durationMs - elapsedMs);

  const onProgressChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const nextProgress = parseFloat(e.target.value);
    setProgress(nextProgress);
    const currentTimeMs = nextProgress * durationMs;
    player.seek(currentTimeMs);
  };
  const onProgressDragStart = () => {
    player.suspend();
  };
  const onProgressDragEnd = () => {
    player.unsuspend();
  };
  const onPlayClick = () => {
    player.play();
  };
  const onPauseClick = () => {
    player.pause();
  };
  const onPreviousClick = () => {
    if (!cursor) {
      return;
    }
    cursor.previous();
    if (!cursor.isFullyVisible()) {
      cursor.scrollIntoView(scrollBehavior);
    }
    const currentTimeMs = cursor.getState().sequenceEntry.durationRange.getStart().ms;
    player.seek(currentTimeMs, false);
    setProgress(currentTimeMs / durationMs);
  };

  const onNextClick = () => {
    if (!cursor) {
      return;
    }
    cursor.next();
    if (!cursor.isFullyVisible()) {
      cursor.scrollIntoView(scrollBehavior);
    }
    const currentTimeMs = cursor.getState().sequenceEntry.durationRange.getStart().ms;
    player.seek(currentTimeMs, false);
    setProgress(currentTimeMs / durationMs);
  };

  const [player, setPlayer] = useState<Player>(() => new Player(durationMs));
  const [playerState, setPlayerState] = useState<PlayerState>(player.getState());

  useEffect(() => {
    if (!div) {
      return;
    }
    if (musicXML.length === 0) {
      return;
    }

    const start = new Date();
    let score: vexml.Score;

    try {
      const logger = new vexml.ConsoleLogger();
      const parser = new vexml.MusicXMLParser();
      const document = parser.parse(musicXML);
      const renderer = new vexml.Renderer(document);
      score = renderer.render(div, {
        config: {
          ...config,
          DRAWING_BACKEND: backend,
          WIDTH: width,
        },
        logger,
      });
      setScore(score);

      if (onClick) {
        score.addEventListener('click', onClick);
      }
      if (onLongpress) {
        score.addEventListener('longpress', onLongpress);
      }
      if (onEnter) {
        score.addEventListener('enter', onEnter);
      }
      if (onExit) {
        score.addEventListener('exit', onExit);
      }
      if (onScroll) {
        score.addEventListener('scroll', onScroll);
      }

      const durationMs = score.getDurationMs();
      const player = new Player(durationMs);
      setPlayer(player);
      setPlayerState(player.getState());

      const cursor = score.addCursor();
      setCursor(cursor);

      const simpleCursor = vexml.SimpleCursor.render(score.getOverlayElement(), STRINGSYNC_RED);

      cursor.addEventListener('change', (e) => {
        simpleCursor.update(e.cursorRect);
      });
      simpleCursor.update(cursor.getState().cursorRect);

      player.addEventListener('statechange', () => {
        setPlayerState(player.getState());
      });

      player.addEventListener('progress', (currentTimeMs) => {
        setProgress(currentTimeMs / durationMs);
        cursor.seek(currentTimeMs);
      });

      score.addEventListener('click', (e) => {
        if (typeof e.timestampMs === 'number') {
          player.seek(e.timestampMs);
        }
      });

      const element = score.getVexflowElement();

      onResult({
        type: 'success',
        start,
        end: new Date(),
        element,
        width,
      });
    } catch (e) {
      onResult({
        type: 'error',
        error: errors.wrap(e),
        start,
        end: new Date(),
        width,
      });
    }

    return () => {
      score.destroy();
    };
  }, [div, backend, width, musicXML, config, onResult, onClick, onLongpress, onEnter, onExit, onScroll]);

  return (
    <div className="w-100">
      <div ref={divRef}></div>

      <>
        <div>
          <div className="d-flex align-items-center gap-3 mt-3">
            <span className="font-monospace">{toTimeString(elapsedMs)}</span>
            <input
              className="w-100 form-range"
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={onProgressChange}
              onMouseDown={onProgressDragStart}
              onMouseUp={onProgressDragEnd}
            ></input>
            <span className="font-monospace">{`-${toTimeString(remainingMs)}`}</span>
          </div>
          <div className="d-flex gap-2 justify-content-center mt-2">
            <button className="btn text-primary border border-0" style={{ fontSize: 20 }} onClick={onPreviousClick}>
              <i className="bi bi-chevron-bar-left"></i>
            </button>

            {playerState === 'paused' && (
              <button onClick={onPlayClick} className="btn btn-outline-primary rounded-circle" style={{ fontSize: 24 }}>
                <i className="bi bi-play-fill"></i>
              </button>
            )}

            {playerState === 'playing' && (
              <button
                onClick={onPauseClick}
                className="btn btn-outline-primary rounded-circle"
                style={{ fontSize: 24 }}
              >
                <i className="bi bi-pause-fill"></i>
              </button>
            )}

            <button className="btn text-primary border border-0" style={{ fontSize: 20 }} onClick={onNextClick}>
              <i className="bi bi-chevron-bar-right"></i>
            </button>
          </div>
        </div>
      </>
    </div>
  );
};

function toTimeString(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

import * as vexml from '@/index';
import * as errors from '../util/errors';
import { getDevice } from '../util/getDevice';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWidth } from '../hooks/useWidth';
import { CursorInput, RenderingBackend } from '../types';
import { Player, PlayerState } from '../lib/Player';

const STRINGSYNC_RED = '#FC354C';

export type LegacyVexmlProps = {
  musicXML: string;
  height: number | undefined;
  backend: RenderingBackend;
  config: vexml.LegacyConfig;
  cursorInputs: CursorInput[];
  onResult: (result: VexmlResult) => void;
  onEvent: vexml.AnyEventListener;
  onPartIdsChange: (partIds: string[]) => void;
};

export type VexmlResult =
  | { type: 'none' }
  | { type: 'empty' }
  | { type: 'success'; start: Date; end: Date; width: number; element: HTMLCanvasElement | SVGElement }
  | { type: 'error'; error: Error; start: Date; end: Date; width: number };

export const LegacyVexml = ({
  musicXML,
  height,
  backend,
  config,
  cursorInputs,
  onResult,
  onEvent,
  onPartIdsChange,
}: LegacyVexmlProps) => {
  const device = useMemo(getDevice, []);
  const scrollBehavior: ScrollBehavior = device.inputType === 'mouseonly' ? 'smooth' : 'auto';

  const divRef = useRef<HTMLDivElement>(null);
  const div = divRef.current;

  const width = useWidth(divRef);

  const [rendering, setRendering] = useState<vexml.Rendering | null>(null);
  const [cursors, setCursors] = useState<vexml.Cursor[]>([]);

  const durationMs = rendering?.getDurationMs() ?? 0;

  const [progress, setProgress] = useState(0);
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

  const [player, setPlayer] = useState<Player>(() => new Player(durationMs));
  const [playerState, setPlayerState] = useState<PlayerState>(player.getState());

  useEffect(() => {
    player.addEventListener('progress', (currentTimeMs: number) => {
      const nextProgress = currentTimeMs / durationMs;
      for (const cursor of cursors) {
        cursor.seek(currentTimeMs);
        if (!cursor.isFullyVisible()) {
          cursor.scrollIntoView(scrollBehavior);
        }
      }
      setProgress(nextProgress);
    });
    player.addEventListener('statechange', (state: PlayerState) => {
      setPlayerState(state);
    });
    return () => {
      player.reset();
    };
  }, [player, scrollBehavior, durationMs, cursors]);

  const onPlayClick = () => {
    player.play();
  };

  const onPauseClick = () => {
    player.pause();
  };

  const onPreviousClick = () => {
    let currentTimeMs = 0;
    for (const cursor of cursors) {
      cursor.previous();
      if (!cursor.isFullyVisible()) {
        cursor.scrollIntoView(scrollBehavior);
      }
      currentTimeMs = cursor.getState().sequenceEntry.durationRange.getStart().ms;
    }
    player.seek(currentTimeMs, false);
    setProgress(currentTimeMs / durationMs);
  };

  const onNextClick = () => {
    let currentTimeMs = 0;
    for (const cursor of cursors) {
      cursor.next();
      if (!cursor.isFullyVisible()) {
        cursor.scrollIntoView(scrollBehavior);
      }
      currentTimeMs = cursor.getState().sequenceEntry.durationRange.getStart().ms;
    }
    player.seek(currentTimeMs, false);
    setProgress(currentTimeMs / durationMs);
  };

  useEffect(() => {
    if (!rendering) {
      return;
    }

    const handles = new Array<number>();

    handles.push(
      rendering.addEventListener('click', (event) => {
        const timestampMs = event.timestampMs;
        if (typeof timestampMs === 'number') {
          player.seek(timestampMs);
        }
        onEvent(event);
      })
    );
    handles.push(rendering.addEventListener('longpress', onEvent));
    handles.push(rendering.addEventListener('exit', onEvent));
    handles.push(rendering.addEventListener('enter', onEvent));

    if (div) {
      const onEnter: vexml.EnterEventListener = (event) => {
        div.style.cursor = 'pointer';

        // TODO: Create official wrapper around vexml Rendering* objects that allows users to color the notes.
        const value = event.target.value;
        switch (value.type) {
          case 'stavenote':
            const vfStaveNote = value.vexflow.staveNote;
            vfStaveNote.getSVGElement()?.remove();
            vfStaveNote.setLedgerLineStyle({ strokeStyle: STRINGSYNC_RED });
            vfStaveNote.setStyle({ fillStyle: STRINGSYNC_RED, strokeStyle: STRINGSYNC_RED }).draw();
            break;
          case 'stavechord':
            value.notes.forEach((note) => {
              const vfStaveNote = note.vexflow.staveNote;
              vfStaveNote.getSVGElement()?.remove();
              vfStaveNote.setLedgerLineStyle({ strokeStyle: STRINGSYNC_RED });
              vfStaveNote.setStyle({ fillStyle: STRINGSYNC_RED, strokeStyle: STRINGSYNC_RED }).draw();
            });
            break;
          case 'tabnote':
            const vfTabNote = value.vexflow.tabNote;
            vfTabNote.getSVGElement()?.remove();
            vfTabNote.setStyle({ fillStyle: STRINGSYNC_RED, strokeStyle: STRINGSYNC_RED }).draw();
            break;
          case 'tabchord':
            value.tabNotes.forEach((tabNote) => {
              const vfTabNote = tabNote.vexflow.tabNote;
              vfTabNote.getSVGElement()?.remove();
              vfTabNote.setStyle({ fillStyle: STRINGSYNC_RED, strokeStyle: STRINGSYNC_RED }).draw();
            });
            break;
          case 'rest':
            value.vexflow.note.getSVGElement()?.remove();
            value.vexflow.note.setStyle({ fillStyle: STRINGSYNC_RED }).draw();
            break;
        }
      };
      const onExit: vexml.ExitEventListener = (event) => {
        div.style.cursor = 'default';

        const value = event.target.value;
        switch (value.type) {
          case 'stavenote':
            const vfStaveNote = value.vexflow.staveNote;
            vfStaveNote.getSVGElement()?.remove();
            vfStaveNote.setLedgerLineStyle({ strokeStyle: 'black' });
            vfStaveNote.setStyle({ fillStyle: 'black', strokeStyle: 'black' }).draw();
            break;
          case 'stavechord':
            value.notes.forEach((note) => {
              const vfStaveNote = note.vexflow.staveNote;
              vfStaveNote.getSVGElement()?.remove();
              vfStaveNote.setLedgerLineStyle({ strokeStyle: 'black' });
              vfStaveNote.setStyle({ fillStyle: 'black', strokeStyle: 'black' }).draw();
            });
            break;
          case 'tabnote':
            const vfTabNote = value.vexflow.tabNote;
            vfTabNote.getSVGElement()?.remove();
            vfTabNote.setStyle({ fillStyle: 'black', strokeStyle: 'black' }).draw();
            break;
          case 'tabchord':
            value.tabNotes.forEach((tabNote) => {
              const vfTabNote = tabNote.vexflow.tabNote;
              vfTabNote.getSVGElement()?.remove();
              vfTabNote.setStyle({ fillStyle: 'black', strokeStyle: 'black' }).draw();
            });
            break;
          case 'rest':
            value.vexflow.note.getSVGElement()?.remove();
            value.vexflow.note.setStyle({ fillStyle: 'black' }).draw();
            break;
        }
      };
      handles.push(rendering.addEventListener('enter', onEnter));
      handles.push(rendering.addEventListener('exit', onExit));
    }

    return () => {
      rendering.removeEventListener(...handles);
    };
  }, [rendering, player, div, onEvent]);

  useEffect(() => {
    if (!rendering) {
      return;
    }

    const overlayElement = rendering.getOverlayElement();

    const dispose = new Array<() => void>();

    const nextCursors = new Array<vexml.Cursor>();
    for (const cursorInput of cursorInputs) {
      const cursor = rendering.addCursor(cursorInput);
      nextCursors.push(cursor);

      const simpleCursor = vexml.SimpleCursor.render(overlayElement, cursorInput.color);

      // TODO: There should be an easier way to do this.
      const handle = cursor.addEventListener('change', (state) => {
        simpleCursor.update(state.cursorRect);
      });
      simpleCursor.update(cursor.getState().cursorRect);

      dispose.push(() => {
        cursor.removeEventListener(handle);
        simpleCursor.remove();
      });
    }

    setCursors(nextCursors);

    return () => {
      for (const fn of dispose) {
        fn();
      }
    };
  }, [rendering, cursorInputs]);

  useEffect(() => {
    if (!musicXML) {
      onResult({ type: 'empty' });
      return;
    }
    if (!div) {
      onResult({ type: 'none' });
      return;
    }
    if (width === 0) {
      onResult({ type: 'none' });
      return;
    }

    const start = new Date();
    let rendering: vexml.Rendering | null = null;

    try {
      rendering = vexml.Vexml.fromMusicXML(musicXML).render({
        element: div,
        height,
        width,
        backend,
        config,
      });
      setRendering(rendering);

      const durationMs = rendering.getDurationMs();
      const player = new Player(durationMs);
      setPlayer(player);
      setPlayerState(player.getState());

      const partIds = rendering.getPartIds();
      onPartIdsChange(partIds);

      const element = rendering.getVexflowElement();
      // For screenshots, we want the background to be white.
      element.style.backgroundColor = 'white';

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
      rendering?.destroy();
    };
  }, [musicXML, height, cursorInputs, backend, config, width, div, onResult, onPartIdsChange]);

  const elapsedMs = progress * durationMs;
  const remainingMs = Math.max(0, durationMs - elapsedMs);

  return (
    <div className="w-100">
      <div ref={divRef}></div>

      {cursors.length > 0 && (
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
                <button
                  onClick={onPlayClick}
                  className="btn btn-outline-primary rounded-circle"
                  style={{ fontSize: 24 }}
                >
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
      )}
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

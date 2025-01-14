import { VexmlResult } from './Vexml';

export type SourceInfoProps = {
  vexmlResult: VexmlResult;
  musicXML: string;
  isMusicXMLLoading: boolean;
  musicXMLError: Error | null;
};

type SourceInfoState =
  | { type: 'unknown' }
  | { type: 'loading' }
  | { type: 'musicxmlempty' }
  | { type: 'musicxmlerror'; error: Error }
  | { type: 'rendersuccess'; timestamp: string; durationMs: number; width: number }
  | { type: 'rendererror'; error: Error; timestamp: string; durationMs: number; width: number };

export const SourceInfo = (props: SourceInfoProps) => {
  const { vexmlResult, isMusicXMLLoading, musicXML, musicXMLError } = props;

  let state: SourceInfoState = { type: 'unknown' };
  if (props.isMusicXMLLoading || vexmlResult.type === 'none') {
    state = { type: 'loading' };
  } else if (!isMusicXMLLoading && musicXML.length === 0) {
    state = { type: 'musicxmlempty' };
  } else if (!isMusicXMLLoading && musicXMLError) {
    state = { type: 'musicxmlerror', error: musicXMLError };
  } else if (vexmlResult.type === 'success') {
    state = {
      type: 'rendersuccess',
      timestamp: timestamp(vexmlResult.end),
      durationMs: vexmlResult.end.getTime() - vexmlResult.start.getTime(),
      width: vexmlResult.width,
    };
  } else if (vexmlResult.type === 'error') {
    state = {
      type: 'rendererror',
      error: vexmlResult.error,
      timestamp: timestamp(vexmlResult.end),
      durationMs: vexmlResult.end.getTime() - vexmlResult.start.getTime(),
      width: vexmlResult.width,
    };
  }

  return (
    <div>
      {state.type === 'loading' && (
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {state.type === 'musicxmlempty' && (
        <div className="alert alert-warning d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>MusicXML document is empty</div>
        </div>
      )}

      {state.type === 'musicxmlerror' && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-circle-fill me-2"></i>
          Could not load MusicXML:
          <pre className="mt-2">{state.error.stack}</pre>
        </div>
      )}

      {state.type === 'rendersuccess' && (
        <div className="alert alert-success d-flex align-items-center" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          <div>
            {state.timestamp} ({state.width}px) rendered in {state.durationMs} ms
          </div>
        </div>
      )}

      {state.type === 'rendererror' && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-circle-fill me-2"></i>
          {state.timestamp} ({state.width}px)
          <pre className="mt-2">{state.error.stack}</pre>
        </div>
      )}
    </div>
  );
};

const timestamp = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padEnd(3, '0').slice(-3);

  return `${hours}:${minutes}:${seconds}.${ms}`;
};

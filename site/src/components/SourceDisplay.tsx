import { useRef } from 'react';
import { useMusicXML } from '../hooks/useMusicXML';
import { Source } from '../types';
import { Vexml } from './Vexml';
import { useTooltip } from '../hooks/useTooltip';
import { SourceMeta } from './SourceMeta';

export type SourceProps = {
  source: Source;
  removable: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onUpdate: (source: Source) => void;
  onRemove: () => void;
};

export const SourceDisplay = (props: SourceProps) => {
  const [musicXML, isLoading] = useMusicXML(props.source);

  const previousButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(previousButtonRef, 'top', 'Previous');

  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(nextButtonRef, 'top', 'Next');

  return (
    <div className="card mt-4 mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between">
          <div className="btn-toolbar" role="toolbar">
            <div className="btn-group me-2" role="group">
              <button type="button" className="btn btn-primary">
                <i className="bi bi-code-slash"></i> Edit
              </button>
            </div>

            <div className="btn-group" role="group">
              <button ref={previousButtonRef} type="button" className="btn btn-secondary" disabled={!props.hasPrevious}>
                <i className="bi bi-arrow-left"></i>
              </button>
              <button ref={nextButtonRef} type="button" className="btn btn-secondary" disabled={!props.hasNext}>
                <i className="bi bi-arrow-right"></i>
              </button>
            </div>
          </div>

          <button type="button" className="btn btn-danger" onClick={props.onRemove} disabled={!props.removable}>
            <i className="bi bi-trash"></i> Remove
          </button>
        </div>

        <div className="d-flex justify-content-center">
          <SourceMeta source={props.source} />
        </div>

        <br />

        <div className="d-flex justify-content-center">
          {isLoading ? <em>loading</em> : <Vexml musicXML={musicXML} />}
        </div>
      </div>
    </div>
  );
};

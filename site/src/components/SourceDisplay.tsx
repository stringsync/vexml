import { useRef, useState } from 'react';
import { useMusicXML } from '../hooks/useMusicXML';
import { Source } from '../types';
import { Vexml, VexmlResult } from './Vexml';
import { useTooltip } from '../hooks/useTooltip';
import { VEXML_VERSION } from '../constants';
import { SourceInfo } from './SourceInfo';

const BUG_REPORT_HREF = `https://github.com/stringsync/vexml/issues/new?assignees=&labels=&projects=&template=bug-report.md&title=[BUG] (v${VEXML_VERSION}): <YOUR TITLE>`;

export type SourceProps = {
  source: Source;
  removable: boolean;
  onUpdate: (source: Source) => void;
  onRemove: () => void;
};

export const SourceDisplay = (props: SourceProps) => {
  const [musicXML, isMusicXMLLoading, musicXMLError] = useMusicXML(props.source);

  const previousButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(previousButtonRef, 'top', 'Previous');

  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(nextButtonRef, 'top', 'Next');

  const [vexmlResult, setVexmlResult] = useState<VexmlResult>({ type: 'none' });

  return (
    <div className="card shadow-sm p-3 mt-4 mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between">
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-primary">
              <i className="bi bi-pencil-square"></i> Edit
            </button>

            <button type="button" className="btn btn-light">
              <i className="bi bi-camera"></i> Snapshot
            </button>

            <a href={BUG_REPORT_HREF} type="button" target="_blank" rel="noopener noreferrer" className="btn btn-light">
              <i className="bi bi-github"></i> Report an Issue
            </a>
          </div>

          <button type="button" className="btn btn-outline-danger" onClick={props.onRemove} disabled={!props.removable}>
            <i className="bi bi-trash"></i> Remove
          </button>
        </div>

        <div className="text-center mt-3">
          {props.source.type === 'remote' && (
            <small className="text-muted">
              <a href={props.source.url} target="_blank" rel="noopener noreferrer">
                {props.source.url}
              </a>
            </small>
          )}

          {props.source.type === 'raw' && <small className="text-muted">local</small>}
        </div>

        <br />

        <SourceInfo
          vexmlResult={vexmlResult}
          musicXML={musicXML}
          isMusicXMLLoading={isMusicXMLLoading}
          musicXMLError={musicXMLError}
        />

        <br />

        {!isMusicXMLLoading && !musicXMLError && (
          <div className="d-flex justify-content-center">
            <Vexml musicXML={musicXML} onResult={setVexmlResult} />
          </div>
        )}
      </div>
    </div>
  );
};

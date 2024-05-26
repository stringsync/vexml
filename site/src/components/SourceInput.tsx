import React, { useId, useRef, useState } from 'react';
import { Source } from '../types';
import { useModal } from '../hooks/useModal';
import DragUpload from './DragUpload';
import { DEFAULT_EXAMPLE_PATH } from '../constants';

export type SourceInputProps = {
  source: Source;
  musicXML: string;
  onUpdate: (source: Source) => void;
};

export const SourceInput = (props: SourceInputProps) => {
  const [source, setSource] = useState<Source>(props.source);

  const timeoutRef = useRef(0);

  const updateNow = (source: Source) => {
    window.clearTimeout(timeoutRef.current);
    setSource(source);
    props.onUpdate(source);
  };

  const updateLater = (source: Source) => {
    window.clearTimeout(timeoutRef.current);
    setSource(source);
    timeoutRef.current = window.setTimeout(() => {
      props.onUpdate(source);
    }, 500);
  };

  const musicXML = source.type === 'local' ? source.musicXML : props.musicXML;
  const onMusicXMLChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (source.type === 'local') {
      updateLater({ type: 'local', musicXML: e.target.value });
    }
  };

  const url = source.type === 'remote' ? source.url : '';
  const onUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (source.type === 'remote') {
      updateLater({ type: 'remote', url: e.target.value });
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);
  const modal = useModal(modalRef);
  const [modalSource, setModalSource] = useState<Source>({ type: 'local', musicXML: '' });
  const onModalContinue = () => {
    updateNow(modalSource);
    modal.hide();
  };

  const onRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const type = e.target.value;
    if (!isSourceType(type)) {
      throw new Error(`Invalid source type: ${type}`);
    }

    const source = getDefaultSource(type);

    const isSourceEmpty =
      (props.source.type === 'local' && props.source.musicXML.length === 0) ||
      (props.source.type === 'remote' && props.source.url.length === 0) ||
      props.source.type === 'example';

    if (isSourceEmpty) {
      setSource(source);
      props.onUpdate(source);
    } else {
      setModalSource(source);
      modal.show();
    }
  };

  const onConvertToLocalClick = () => {
    const source = getDefaultSource('local');
    source.musicXML = props.musicXML;
    updateNow(source);
  };

  const sourceTypeRadioName = useId();
  const localRadioId = useId();
  const exampleRadioId = useId();
  const remoteRadioId = useId();

  const isConvertToLocalDisabled = props.musicXML.length === 0 || props.source.type === 'local';
  const isTextareaDisabled = props.source.type !== 'local';
  const textareaPlaceholder = props.source.type === 'local' ? 'Write or paste MusicXML here' : '';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name={sourceTypeRadioName}
              id={localRadioId}
              value="local"
              checked={props.source.type === 'local'}
              onChange={onRadioChange}
            />
            <label className="form-check-label" htmlFor={localRadioId}>
              local
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name={sourceTypeRadioName}
              id={exampleRadioId}
              value="example"
              checked={props.source.type === 'example'}
              onChange={onRadioChange}
            />
            <label className="form-check-label" htmlFor={exampleRadioId}>
              example
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name={sourceTypeRadioName}
              id={remoteRadioId}
              value="remote"
              checked={props.source.type === 'remote'}
              onChange={onRadioChange}
            />
            <label className="form-check-label" htmlFor={remoteRadioId}>
              remote
            </label>
          </div>
        </div>

        <div>
          <button className="btn btn-warning" disabled={isConvertToLocalDisabled} onClick={onConvertToLocalClick}>
            <i className="bi bi-cloud-arrow-down"></i> Convert to local
          </button>
        </div>
      </div>

      <hr />

      <div className="row">
        <div className="col-md-6 col-12 mb-4 mb-md-0">
          {props.source.type === 'local' && (
            <>
              <div className="d-none d-md-block">
                <DragUpload placeholder="Select or drop a MusicXML file here" onChange={() => {}} />
              </div>
              <div className="d-block d-md-none">
                <input type="file" className="form-control" />
              </div>
            </>
          )}

          {props.source.type === 'example' && <div>Example</div>}

          {props.source.type === 'remote' && (
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text" id="inputGroup-sizing-lg">
                  URL
                </span>
                <input type="url" className="form-control" value={url} onChange={onUrlChange} />
              </div>
              <div className="callout">
                This must be a <strong>direct</strong>
                URL to a <code>.musicxml</code> or <code>.mxl</code> file.
              </div>
            </div>
          )}
        </div>

        <div className="col-md-6 col-12">
          <textarea
            className="form-control"
            style={{ height: '300px' }}
            value={musicXML}
            disabled={isTextareaDisabled}
            placeholder={textareaPlaceholder}
            onChange={onMusicXMLChange}
          ></textarea>
        </div>
      </div>

      <div className="modal fade" tabIndex={-1} aria-hidden="true" ref={modalRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5">Warning</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">When changing source types, you may lose the changes you made.</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={onModalContinue}>
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const isSourceType = (value: any): value is Source['type'] =>
  value === 'local' || value === 'remote' || value === 'example';

const getDefaultSource = <T extends Source['type']>(type: T): Extract<Source, { type: T }> => {
  switch (type) {
    case 'local':
      return { type, musicXML: '' } as Extract<Source, { type: T }>;
    case 'remote':
      return { type, url: '' } as Extract<Source, { type: T }>;
    case 'example':
      return { type, path: DEFAULT_EXAMPLE_PATH } as Extract<Source, { type: T }>;
    default:
      throw new Error(`Invalid source type: ${type}`);
  }
};

import { useId, useRef, useState } from 'react';
import { Source } from '../types';
import { useModal } from '../hooks/useModal';

export type SourceInputProps = {
  source: Source;
  onUpdate: (source: Source) => void;
};

export const SourceInput = (props: SourceInputProps) => {
  const sourceTypeRadioName = useId();
  const localRadioId = useId();
  const exampleRadioId = useId();
  const remoteRadioId = useId();

  const modalRef = useRef<HTMLDivElement>(null);
  const modal = useModal(modalRef);

  const [nextSource, setNextSource] = useState<Source>(() => getDefaultSource('local'));

  const onModalContinue = () => {
    props.onUpdate(nextSource);
    modal.hide();
    setNextSource(getDefaultSource('local'));
  };

  const onRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const type = e.target.value;
    if (!isSourceType(type)) {
      throw new Error(`Invalid source type: ${type}`);
    }
    const source = getDefaultSource(type);
    setNextSource(source);

    const isEmpty =
      (props.source.type === 'local' && props.source.musicXML.length === 0) ||
      (props.source.type === 'remote' && props.source.url.length === 0) ||
      (props.source.type === 'example' && props.source.example.type === 'none');

    if (isEmpty) {
      props.onUpdate(source);
    } else {
      modal.show();
    }
  };

  return (
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

      <div className="modal fade" tabIndex={-1} aria-hidden="true" ref={modalRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5">Warning</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">You will lose any changes!</div>
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

const getDefaultSource = (type: Source['type']): Source => {
  switch (type) {
    case 'local':
      return { type, musicXML: '' };
    case 'remote':
      return { type, url: '' };
    case 'example':
      return { type, example: { type: 'none' } };
  }
};

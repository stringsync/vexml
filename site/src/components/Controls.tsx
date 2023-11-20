import { Tooltip } from 'bootstrap';
import { useCallback, useEffect, useRef } from 'react';
import DragUpload from './DragUpload';

export type ControlsProps = {
  value: string;
  saveDisabled: boolean;
  resetDisabled: boolean;
  reportDisabled: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
  onReport: () => void;
};

function Controls(props: ControlsProps) {
  const { onChange } = props;

  const onFileInputChange = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onChange(text);
        }
      };
      reader.readAsText(files[0]);
    },
    [onChange]
  );

  const onTextAreaInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    onChange(event.currentTarget.value);
  };

  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // install tooltip
  useEffect(() => {
    const saveButton = saveButtonRef.current;
    if (!saveButton) {
      return;
    }

    const tooltip = new Tooltip(saveButton, {
      title: '5MB limit',
      placement: 'top',
      trigger: 'hover',
    });

    return () => tooltip.dispose();
  }, []);

  return (
    <>
      <div className="custom-file mb-4">
        <div className="row">
          <div className="col">
            <DragUpload placeholder="Select or drop a MusicXML file here" onChange={onFileInputChange} />
          </div>
          <div className="col">
            <textarea
              className="form-control form-control"
              style={{ height: '300px' }}
              value={props.value}
              onInput={onTextAreaInput}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="mb-4"></div>

      <div className="mb-4 d-flex gap-2">
        <button
          id="saveButton"
          className="btn btn-success"
          type="button"
          ref={saveButtonRef}
          disabled={props.saveDisabled}
          onClick={props.onSave}
        >
          <i className="bi bi-floppy"></i> Save
        </button>

        <button
          id="resetButton"
          type="button"
          className="btn btn-danger"
          disabled={props.resetDisabled}
          onClick={props.onReset}
        >
          <i className="bi bi-arrow-clockwise"></i> Reset
        </button>

        <button
          id="reportButton"
          type="button"
          className="btn btn-primary"
          disabled={props.reportDisabled}
          onClick={props.onReport}
        >
          <i className="bi bi-github"></i> Report an Issue
        </button>
      </div>
    </>
  );
}

export default Controls;

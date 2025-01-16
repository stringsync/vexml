import React from 'react';
import { useState } from 'react';

export type DragUploadProps = {
  placeholder: string;
  onChange: (files: File[]) => void;
};

function DragUpload({ placeholder, onChange }: DragUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState(new Array<File>());

  const onDragEnter: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (files) {
      const nextFiles = [...files];
      setFiles(nextFiles);
      onChange(nextFiles);
    }
  };

  const onSelectFile: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = event.target.files;
    if (files) {
      const nextFiles = [...files];
      setFiles(nextFiles);
      onChange(nextFiles);
    }
  };

  return (
    <div>
      <div
        className={`border rounded ${
          dragging ? 'border-primary' : ''
        } d-flex justify-content-center align-items-center`}
        style={{ height: '300px', cursor: 'pointer', position: 'relative' }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {placeholder}
        <input
          type="file"
          className="form-control"
          onChange={onSelectFile}
          style={{
            opacity: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="list-group mt-2">
          {Array.from(files).map((file, index) => (
            <li key={index} className="list-group-item">
              {file.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DragUpload;

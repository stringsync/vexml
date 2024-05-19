import { Source } from '../types';

export type SourceInputProps = {
  onAdd: (source: Source) => void;
};

export const SourceInput = (props: SourceInputProps) => {
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onAdd({
      type: 'raw',
      musicXML: '',
    });
  };

  return (
    <button type="button" className="btn btn-outline-primary btn-lg" onClick={onClick}>
      <i className="bi bi-plus"></i> Add
    </button>
  );
};

import { Source } from '../types';

export type SourceMetaProps = {
  source: Source;
};

export const SourceMeta = (props: SourceMetaProps) => {
  switch (props.source.type) {
    case 'remote':
      return (
        <small className="text-muted">
          <em>
            <a href={props.source.url} target="_blank" rel="noopener noreferrer">
              {props.source.url}
            </a>
          </em>
        </small>
      );
    case 'raw':
      return (
        <small className="text-muted">
          <em>(local)</em>
        </small>
      );
  }
};

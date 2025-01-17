import * as vexml from '@/index';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { useRef } from 'react';
import { useTooltip } from '../hooks/useTooltip';

export const EVENT_LOG_CAPACITY = 10;
const EVENT_LOG_CARD_STYLE = { width: '300px', height: '250px' };

export type EventLog = {
  key: string;
  type: string;
  timestamp: Date;
  event: vexml.EventMap[vexml.EventType];
};

export type EventLogCardProps = {
  index: number;
  log: EventLog;
};

export const EventLogCard = (props: EventLogCardProps) => {
  const log = props.log;
  const index = props.index;

  const timeAgo = useTimeAgo(log.timestamp);

  const payload = describe(log.event);

  const copyButtonRef = useRef<HTMLButtonElement>(null);
  useTooltip(copyButtonRef, 'top', 'Copy to clipboard');
  const onCopyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(payload);
  };

  return (
    <div
      key={log.key}
      className="card rounded flex-grow-0 flex-shrink-0 position-relative"
      style={EVENT_LOG_CARD_STYLE}
    >
      <div className="card-body overflow-auto">
        <h5 className="card-title d-flex justify-content-between align-items-center">
          {log.type}{' '}
          <span className="badge text-bg-primary" style={{ opacity: opacity(index) }}>
            new
          </span>
        </h5>
        <h6 className="card-subtitle mb-2 text-body-secondary">
          <em>{timeAgo}</em>
        </h6>
        <pre className="card-text">{payload}</pre>
        <button
          ref={copyButtonRef}
          className="btn btn-light btn-ghost position-absolute bottom-0 end-0 mb-3 me-3"
          onClick={onCopyClick}
        >
          <i className="bi bi-copy"></i>
        </button>
      </div>
    </div>
  );
};

const opacity = (index: number): number => {
  const easing = 0.33;
  return 1 - Math.pow(index / EVENT_LOG_CAPACITY, easing);
};

const stringify = (object: unknown): string => JSON.stringify(object, null, 2);

const describe = (event: vexml.AnyEvent): string => {
  switch (event.type) {
    case 'click':
    case 'longpress':
    case 'enter':
    case 'exit':
      return stringify({
        timestampMs: event.timestampMs,
        target: `[${event.target.name}]`,
        rect: event.target.rect(),
      });
    default:
      return `[${event.type} details]`;
  }
};

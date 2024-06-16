import * as vexml from '@/index';
import { useTimeAgo } from '../hooks/useTimeAgo';

export const EVENT_LOG_CAPACITY = 10;
const EVENT_LOG_CARD_STYLE = { maxHeight: '400px' };

export type EventLog = {
  key: string;
  type: string;
  timestamp: Date;
  payload: vexml.EventMap[keyof vexml.EventMap];
};

export type EventLogCardProps = {
  index: number;
  log: EventLog;
};

export const EventLogCard = (props: EventLogCardProps) => {
  const log = props.log;
  const index = props.index;

  const timeAgo = useTimeAgo(log.timestamp);

  return (
    <div key={log.key} className="card rounded flex-grow-0 flex-shrink-0 overflow-y-auto" style={EVENT_LOG_CARD_STYLE}>
      <div className="card-body">
        <h5 className="card-title d-flex justify-content-between align-items-center">
          {log.type}{' '}
          <span className="badge text-bg-primary" style={{ opacity: opacity(index) }}>
            new
          </span>
        </h5>
        <h6 className="card-subtitle mb-2 text-body-secondary">
          <em>{timeAgo}</em>
        </h6>
        <pre className="card-text">{stringify(log.payload)}</pre>
      </div>
    </div>
  );
};

const opacity = (index: number): number => {
  const easing = 0.33;
  return 1 - Math.pow(index / EVENT_LOG_CAPACITY, easing);
};

const stringify = <T extends object>(payload: T) =>
  JSON.stringify(
    payload,
    (key, value) => {
      const isComplexObject =
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        value.constructor !== Object &&
        // TODO(jared): This might not work when building. Find a different way to check for vexflow objects.
        // Avoid expanding vexflow objects.
        value.constructor.name.startsWith('_');
      if (isComplexObject) {
        return `[${value.constructor.name}]`;
      }
      return value;
    },
    2
  );

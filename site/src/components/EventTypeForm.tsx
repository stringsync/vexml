import * as vexml from '@/index';
import { useId, useState } from 'react';

const EVENT_TYPES = ['click', 'longpress', 'enter', 'exit'] as const;

export type EventTypeFormProps = {
  defaultEventTypes: vexml.EventType[];
  onEventTypesChange: (eventTypes: vexml.EventType[]) => void;
};

export const EventTypeForm = (props: EventTypeFormProps) => {
  const [eventTypes, setEventTypes] = useState<vexml.EventType[]>(props.defaultEventTypes);

  const suffix = useId();
  const id = (eventType: vexml.EventType) => `${eventType}-${suffix}`;

  const onChange = (eventType: vexml.EventType) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let nextEventTypes: vexml.EventType[];
    if (event.target.checked) {
      nextEventTypes = Array.from(new Set([...eventTypes, eventType]));
    } else {
      nextEventTypes = eventTypes.filter((e) => e !== eventType);
    }
    setEventTypes(nextEventTypes);
    props.onEventTypesChange(nextEventTypes);
  };

  return (
    <div>
      {EVENT_TYPES.map((eventType) => (
        <div key={eventType} className="form-check form-check-inline">
          <input
            className="form-check-input"
            id={id(eventType)}
            type="checkbox"
            value="click"
            checked={eventTypes.includes(eventType)}
            onChange={onChange(eventType)}
          />
          <label className="form-check-label" htmlFor={id(eventType)}>
            {eventType}
          </label>
        </div>
      ))}

      <hr />
    </div>
  );
};

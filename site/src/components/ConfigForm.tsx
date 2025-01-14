import * as vexml from '@/index';
import { CSSProperties, useId, useRef, useState } from 'react';
import { useTooltip } from '../hooks/useTooltip';

const DESCRIPTOR_CONTROL_BLOCKLIST = ['WIDTH'];

const SLIDER_VALUE_STYLE: CSSProperties = { width: '3em' };

const DESCRIPTOR_TYPE_ORDER = ['enum', 'string', 'number', 'boolean'] as const;

const SCHEMA_CONFIG_ENTRIES = Object.entries(vexml.CONFIG).sort((a, b) => {
  const aIndex = DESCRIPTOR_TYPE_ORDER.indexOf(a[1].type);
  const bIndex = DESCRIPTOR_TYPE_ORDER.indexOf(b[1].type);
  return aIndex - bIndex;
});

const DEFAULT_CONFIG = {
  ...vexml.DEFAULT_CONFIG,
  HEIGHT: 400,
};

export type ConfigFormProps = {
  defaultValue: vexml.Config;
  onChange(config: vexml.Config): void;
};

export const ConfigForm = (props: ConfigFormProps) => {
  const [config, setConfig] = useState(props.defaultValue ?? DEFAULT_CONFIG);

  const updateNow = (config: vexml.Config) => {
    props.onChange(config);
  };

  const timeoutRef = useRef(0);
  const updateLater = (config: vexml.Config) => {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      props.onChange(config);
    }, 500);
  };

  function get<T>(key: string): T {
    return config[key as keyof vexml.Config] as T;
  }

  function set<T>(key: string, opts?: { immediate: boolean }) {
    return (value: T) => {
      const nextConfig = { ...config, [key]: value };
      setConfig(nextConfig);
      if (opts?.immediate) {
        updateNow(nextConfig);
      } else {
        updateLater(nextConfig);
      }
    };
  }

  function label(key: string): string {
    return key
      .split('_')
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  function onResetClick() {
    const nextConfig = DEFAULT_CONFIG;
    setConfig(nextConfig);
    updateNow(nextConfig);
  }

  const isResetButtonDisabled = Object.entries(config).every(
    ([key, value]) => value === DEFAULT_CONFIG[key as keyof vexml.Config]
  );

  return (
    <div>
      <div>
        <button className="btn btn-danger btn-sm" onClick={onResetClick} disabled={isResetButtonDisabled}>
          <i className="bi bi-arrow-counterclockwise"></i> Reset Config
        </button>
      </div>

      <hr />

      <div className="row g-3">
        {SCHEMA_CONFIG_ENTRIES.filter(([key]) => !DESCRIPTOR_CONTROL_BLOCKLIST.includes(key)).map(
          ([key, descriptor]) => (
            <div key={key} className="col-md-6 col-lg-4">
              {descriptor.type === 'string' && (
                <StringInput
                  key={key}
                  label={label(key)}
                  value={get<string>(key)}
                  defaultValue={DEFAULT_CONFIG[key as keyof vexml.Config] as string}
                  help={descriptor.help}
                  onChange={set<string>(key)}
                />
              )}

              {descriptor.type === 'number' && descriptor.defaultValue !== null && (
                <NumberInput
                  key={key}
                  label={label(key)}
                  value={get<number>(key)}
                  defaultValue={DEFAULT_CONFIG[key as keyof vexml.Config] as number}
                  help={descriptor.help}
                  onChange={set<number>(key)}
                />
              )}

              {descriptor.type === 'number' && descriptor.defaultValue === null && (
                <NullableNumberInput
                  key={key}
                  label={label(key)}
                  value={get<number>(key)}
                  defaultValue={DEFAULT_CONFIG[key as keyof vexml.Config] as number | null}
                  max={1000}
                  help={descriptor.help}
                  onChange={set<number>(key)}
                />
              )}

              {descriptor.type === 'boolean' && (
                <BooleanInput
                  key={key}
                  label={label(key)}
                  value={get<boolean>(key)}
                  help={descriptor.help}
                  onChange={set<boolean>(key, { immediate: true })}
                />
              )}

              {descriptor.type === 'enum' && (
                <EnumInput
                  key={key}
                  label={label(key)}
                  value={get<string>(key)}
                  defaultValue={DEFAULT_CONFIG[key as keyof vexml.Config] as string}
                  choices={descriptor.choices}
                  help={descriptor.help}
                  onChange={set<string>(key, { immediate: true })}
                />
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const StringInput = (props: {
  label: string;
  value: string;
  defaultValue: string;
  help: string;
  onChange(value: string): void;
}) => {
  const id = useId();

  const tooltipRef = useRef<HTMLElement>(null);
  useTooltip(tooltipRef, 'top', props.help);

  return (
    <div>
      <label htmlFor={id} className="form-label">
        {props.label}
      </label>
      <small ref={tooltipRef} className="ms-2">
        <i className="bi bi-question-circle"></i>
      </small>
      <div className="input-group">
        <input
          id={id}
          className="form-control"
          value={props.value ?? ''}
          onChange={(e) => props.onChange(e.target.value)}
        />
        <button
          className="btn border-0"
          type="button"
          disabled={props.value === props.defaultValue}
          onClick={() => props.onChange(props.defaultValue)}
        >
          <i className="bi bi-arrow-counterclockwise"></i>
        </button>
      </div>
    </div>
  );
};

const NumberInput = (props: {
  label: string;
  value: number;
  defaultValue: number;
  help: string;
  onChange(value: number): void;
}) => {
  const id = useId();

  const tooltipRef = useRef<HTMLElement>(null);
  useTooltip(tooltipRef, 'top', props.help);

  return (
    <div>
      <label htmlFor={id} className="form-label">
        {props.label}
      </label>
      <small ref={tooltipRef} className="ms-2">
        <i className="bi bi-question-circle"></i>
      </small>
      <div className="d-flex align-items-center">
        <input
          id={id}
          type="range"
          className="form-range"
          value={props.value ?? 0}
          min={0}
          max={4 * props.defaultValue}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
        <p className="mb-0 ms-2 text-center" style={SLIDER_VALUE_STYLE}>
          {props.value}
        </p>
        <button
          className="btn btn border-0"
          type="button"
          disabled={props.value === props.defaultValue}
          onClick={() => props.onChange(props.defaultValue)}
        >
          <i className="bi bi-arrow-counterclockwise"></i>
        </button>
      </div>
    </div>
  );
};

export const NullableNumberInput = (props: {
  label: string;
  value: number;
  defaultValue: number | null;
  help: string;
  max: number;
  onChange(value: number | null): void;
}) => {
  const id = useId();

  const tooltipRef = useRef<HTMLElement>(null);
  useTooltip(tooltipRef, 'top', props.help);

  const onChange = (value: number | null) => {
    if (value === 0) {
      props.onChange(null);
    } else {
      props.onChange(value);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="form-label">
        {props.label}
      </label>
      <small ref={tooltipRef} className="ms-2">
        <i className="bi bi-question-circle"></i>
      </small>
      <div className="d-flex align-items-center">
        <input
          id={id}
          type="range"
          className="form-range"
          value={props.value ?? 0}
          min={0}
          max={props.max}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <p className="mb-0 ms-2 text-center" style={SLIDER_VALUE_STYLE}>
          {props.value ?? 'null'}
        </p>
        <button
          className="btn btn border-0"
          type="button"
          disabled={props.value === props.defaultValue}
          onClick={() => onChange(props.defaultValue)}
        >
          <i className="bi bi-arrow-counterclockwise"></i>
        </button>
      </div>
    </div>
  );
};

const BooleanInput = (props: { label: string; value: boolean; help: string; onChange(value: boolean): void }) => {
  const id = useId();

  const tooltipRef = useRef<HTMLElement>(null);
  useTooltip(tooltipRef, 'top', props.help);

  return (
    <div className="form-check">
      <input
        id={id}
        className="form-check-input"
        type="checkbox"
        checked={props.value}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <label htmlFor={id} className="form-check-label">
        {props.label}
      </label>
      <small ref={tooltipRef} className="ms-2">
        <i className="bi bi-question-circle"></i>
      </small>
    </div>
  );
};

const EnumInput = (props: {
  label: string;
  value: string;
  defaultValue: string;
  choices: readonly string[];
  help: string;
  onChange(value: string): void;
}) => {
  const id = useId();

  const tooltipRef = useRef<HTMLElement>(null);
  useTooltip(tooltipRef, 'top', props.help);

  return (
    <div>
      <label htmlFor={id} className="mb-2">
        {props.label}
      </label>
      <small ref={tooltipRef} className="ms-2">
        <i className="bi bi-question-circle"></i>
      </small>
      <div className="input-group">
        <select id={id} className="form-select" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
          {props.choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
        <button
          className="btn btn border-0"
          type="button"
          disabled={props.value === props.defaultValue}
          onClick={() => props.onChange(props.defaultValue)}
        >
          <i className="bi bi-arrow-counterclockwise"></i>
        </button>
      </div>
    </div>
  );
};

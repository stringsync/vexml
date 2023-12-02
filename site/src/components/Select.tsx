import { useState } from 'react';

export type SelectProps<T> = {
  options: SelectOption<T>[];
  selection: React.Key;
  onChange: (value: T) => void;
};

export type SelectOption<T> = {
  text: string;
  key: React.Key;
  value: T;
};

function Select<T>(props: SelectProps<T>) {
  const [selection, setSelection] = useState(() => props.selection ?? props.options[0]?.key ?? null);

  const onChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const index = parseInt(e.target.value, 10);
    const option = props.options[index];
    setSelection(option.key);
    props.onChange(option.value);
  };

  return (
    <select className="form-select" onChange={onChange}>
      {props.options.map((option, index) => (
        <option key={option.key} selected={option.key === selection} value={index}>
          {option.text}
        </option>
      ))}
    </select>
  );
}

export default Select;

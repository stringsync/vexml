export type SelectProps<T> = {
  options: SelectOption<T>[];
  selectedKey: React.Key;
  onChange: (event: SelectEvent<T>) => void;
};

export type SelectEvent<T> = {
  key: React.Key;
  value: T;
};

export type SelectOption<T> = {
  text: string;
  key: React.Key;
  value: T;
  disabled?: boolean;
};

function Select<T>(props: SelectProps<T>) {
  const selectedIndex = props.options.findIndex((option) => option.key === props.selectedKey);

  const onChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const index = parseInt(e.target.value, 10);
    const option = props.options[index];
    props.onChange({ key: option.key, value: option.value });
  };

  return (
    <select className="form-select" onChange={onChange} value={selectedIndex}>
      {props.options.map((option, index) => (
        <option key={option.key} value={index} disabled={option.disabled ?? false}>
          {option.text}
        </option>
      ))}
    </select>
  );
}

export default Select;

export type SelectProps<T> = {
  groups: SelectOptionGroup<T>[];
  selectedKey: string;
  onChange: (event: SelectEvent<T>) => void;
};

type OptionGroupProps<T> = {
  group: MultiSelectOptionGroup<T>;
};

type OptionProps<T> = {
  option: SelectOption<T>;
};

export type SelectEvent<T> = {
  key: string;
  value: T;
};

export type SelectOptionGroup<T> = MultiSelectOptionGroup<T> | SingleSelectOptionGroup<T>;

export type MultiSelectOptionGroup<T> = {
  type: 'multi';
  label: string;
  options: SelectOption<T>[];
};

export type SingleSelectOptionGroup<T> = {
  type: 'single';
  option: SelectOption<T>;
};

export type SelectOption<T> = {
  label: string;
  key: string;
  value: T;
  disabled?: boolean;
};

export function Select<T>(props: SelectProps<T>) {
  const onChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const key = e.target.value;
    const value = props.groups
      .flatMap((group) => (group.type === 'multi' ? group.options : group.option))
      .find((option) => option.key === key)!.value;
    props.onChange({ key, value });
  };

  return (
    <select className="form-select" onChange={onChange} value={props.selectedKey}>
      {props.groups.map((group) =>
        group.type === 'multi' ? (
          <OptionGroup key={group.label} group={group} />
        ) : (
          <Option key={group.option.key} option={group.option} />
        )
      )}
    </select>
  );
}

function OptionGroup<T>({ group }: OptionGroupProps<T>) {
  return (
    <optgroup label={group.label}>
      {group.options.map((option) => (
        <Option key={option.key} option={option} />
      ))}
    </optgroup>
  );
}

function Option<T>({ option }: OptionProps<T>) {
  return (
    <option key={option.key} value={option.key} disabled={option.disabled ?? false}>
      {option.label}
    </option>
  );
}

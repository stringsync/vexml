import { useEffect, useState } from 'react';
import { CursorInput } from '../types';
import { Select, SelectOptionGroup } from './Select';
import { useNextKey } from '../hooks/useNextKey';
import * as vexml from '@/index';

const COLORS = ['#FC354C', '#FFB400', '#00BD9D', '#00A2FF', '#8A79AF'];

const DEFAULT_PART_ID_KEY = 'vexml-default';

export type CursorFormProps = {
  partIds: string[];
  onChange(cursors: CursorInput[]): void;
};

export const CursorForm = (props: CursorFormProps) => {
  const nextCursorId = useNextKey('cursor');
  const [cursor, setCursor] = useState<CursorInput>(() => ({
    type: 'discrete',
    id: nextCursorId(),
    color: COLORS[0],
  }));
  const [cursors, setCursors] = useState(new Array<CursorInput>());

  useEffect(() => {
    const cursorPartIds = cursors
      .map((cursor) => cursor.partId)
      .filter((partId): partId is string => typeof partId === 'string');
    if (cursorPartIds.some((partId) => !props.partIds.includes(partId))) {
      const nextCursors = cursors.filter(
        (cursor) => typeof cursor.partId !== 'string' || props.partIds.includes(cursor.partId)
      );
      setCursors(nextCursors);
      props.onChange(nextCursors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursors, props.partIds, props.onChange]);

  const colorSelectOptionGroups = COLORS.map<SelectOptionGroup<string>>((color) => ({
    type: 'single',
    option: { label: color, key: color, value: color },
  }));

  const cursorTypeSelectOptionGroups: Array<SelectOptionGroup<CursorInput['type']>> = [
    {
      type: 'single',
      option: { label: 'discrete', key: 'discrete', value: 'discrete' },
    },
  ];

  const partIdSelectOptionGroups: Array<SelectOptionGroup<string | undefined>> = [
    {
      type: 'single',
      option: { label: 'default', key: DEFAULT_PART_ID_KEY, value: undefined },
    },
    ...props.partIds.map<SelectOptionGroup<string>>((partId) => ({
      type: 'single',
      option: { label: partId, key: partId, value: partId },
    })),
  ];

  const onAdd = () => {
    const nextCursors = [cursor, ...cursors];
    setCursors(nextCursors);
    props.onChange(nextCursors);

    const nextColorIndex = (COLORS.findIndex((color) => color === cursor.color) + 1) % COLORS.length;

    const partIds = [undefined, ...props.partIds];
    const nextPartIdIndex = (partIds.findIndex((partId) => partId === cursor.partId) + 1) % partIds.length;
    const nextPartId = partIds[nextPartIdIndex];
    setCursor({
      type: 'discrete',
      id: nextCursorId(),
      color: COLORS[nextColorIndex],
      partId: nextPartId,
    });
  };

  const onRemove = (id: string) => {
    const nextCursors = [...cursors].filter((cursor) => cursor.id !== id);
    setCursors(nextCursors);
    props.onChange(nextCursors);
  };

  return (
    <div>
      <div className="row">
        <div className="col d-flex align-items-center gap-2">
          <div
            className="border border-black"
            style={{ backgroundColor: cursor.color, minWidth: 32, minHeight: 32, maxWidth: 32, maxHeight: 32 }}
          ></div>
          <Select
            groups={colorSelectOptionGroups}
            selectedKey={cursor.color}
            onChange={(e) => {
              setCursor((cursor) => ({ ...cursor, color: e.value }));
            }}
          />
        </div>

        <div className="col">
          <Select
            disabled
            groups={cursorTypeSelectOptionGroups}
            selectedKey={cursor.type}
            onChange={(e) => {
              setCursor((cursor) => ({ ...cursor, type: e.value }));
            }}
          />
        </div>

        <div className="col">
          <Select
            groups={partIdSelectOptionGroups}
            selectedKey={cursor.partId ?? DEFAULT_PART_ID_KEY}
            onChange={(e) => {
              setCursor((cursor) => ({ ...cursor, partId: e.value }));
            }}
          />
        </div>

        <div className="col d-grid">
          <button className="btn btn-outline-success" onClick={onAdd}>
            Add
          </button>
        </div>
      </div>

      <hr />

      <div className="d-grid gap-3">
        {cursors.map((cursor) => (
          <div key={cursor.id} className="row">
            <div className="col d-flex align-items-center gap-2">
              <div
                className="border border-black"
                style={{ backgroundColor: cursor.color, minWidth: 32, minHeight: 32, maxWidth: 32, maxHeight: 32 }}
              ></div>
              <Select disabled groups={colorSelectOptionGroups} selectedKey={cursor.color} />
            </div>

            <div className="col">
              <Select disabled groups={cursorTypeSelectOptionGroups} selectedKey={cursor.type} />
            </div>

            <div className="col">
              <Select disabled groups={partIdSelectOptionGroups} selectedKey={cursor.partId ?? DEFAULT_PART_ID_KEY} />
            </div>

            <div className="col d-grid">
              <button className="btn btn-outline-danger" onClick={() => onRemove(cursor.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

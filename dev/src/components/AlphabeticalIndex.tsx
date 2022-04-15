import { Divider, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const NewspaperColumns = styled.div`
  @media (max-width: 600px) {
    column-count: 1;
  }

  @media (min-width: 600px) {
    column-count: 1;
  }

  @media (min-width: 768px) {
    column-count: 2;
  }

  @media (min-width: 992px) {
    column-count: 3;
  }

  @media (min-width: 1500px) {
    column-count: 4;
  }
`;

const StyledList = styled.ul`
  list-style-type: none;
`;

const StyledListItem = styled.li`
  border-radius: 4px;

  :hover {
    background-color: #eee;
  }
`;

type IndexEntry = {
  letter: string;
  items: string[];
};

export type AlphabeticalIndexProps = {
  keys: string[];
  renderKey: (key: string) => React.ReactNode;
};

export const AlphabeticalIndex: React.FC<AlphabeticalIndexProps> = (props) => {
  const { keys, renderKey } = props;

  const [entries, setEntries] = useState(new Array<IndexEntry>());

  useEffect(() => {
    const strsByFirstChar = groupByFirstChar(keys);
    const nextEntries = Object.keys(strsByFirstChar)
      .sort()
      .map((letter) => ({ letter, items: strsByFirstChar[letter].sort() }));
    setEntries(nextEntries);
  }, [keys]);

  return (
    <NewspaperColumns>
      {entries.map((entry) => (
        <div key={entry.letter}>
          <Typography.Title level={3}>{entry.letter}</Typography.Title>

          <Divider />

          <StyledList>
            {entry.items.map((item) => (
              <StyledListItem key={item}>{renderKey(item)}</StyledListItem>
            ))}
          </StyledList>
        </div>
      ))}
    </NewspaperColumns>
  );
};

const groupByFirstChar = (strs: string[]): Record<string, string[]> => {
  const isNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);
  const isLetter = (value: string): boolean => value.toLowerCase() != value.toUpperCase();

  const groups: Record<string, string[]> = {};
  for (const str of strs) {
    if (isNumber(parseInt(str))) {
      groups['#'] = groups['#'] || [];
      groups['#'].push(str);
    } else if (isLetter(str)) {
      const letter = str[0].toLowerCase();
      groups[letter] = groups[letter] || [];
      groups[letter].push(str);
    } else {
      groups['?'] = groups['?'] || [];
      groups['?'].push(str);
    }
  }
  return groups;
};

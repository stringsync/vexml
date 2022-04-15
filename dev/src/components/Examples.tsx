import { Divider, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Format, useFetch } from '../hooks/useFetch';
import { AlphabeticalIndex } from './AlphabeticalIndex';
import { Example } from './Example';
import { RenderStatus } from './RenderStatus';
import { VexmlStatus } from './Vexml';

const ExampleContainer = styled.div`
  padding-bottom: 24px;
`;

export const Examples: React.FC = () => {
  const result = useFetch('/manifest', Format.Json);

  const [statuses, setStatuses] = useState<Record<string, VexmlStatus>>({});
  const onUpdate = useCallback((state: VexmlStatus) => {
    setStatuses((statuses) => ({ ...statuses, [state.exampleId]: state }));
  }, []);

  const renderExampleStatus = useCallback(
    (exampleId: string) => {
      return (
        <>
          <RenderStatus exampleId={exampleId} status={statuses[exampleId]} />
          <Divider type="vertical" />
          <a href={`#${exampleId}`}>jump</a>
          <Divider type="vertical" />
          <Link to={`/${exampleId}`}>show</Link>
        </>
      );
    },
    [statuses]
  );

  return (
    <>
      {result.type === 'success' && (
        <>
          <Typography.Title id="index" level={2}>
            index
          </Typography.Title>
          <AlphabeticalIndex keys={result.data.examples} renderKey={renderExampleStatus} />

          <Divider />

          <Typography.Title id="examples" level={2}>
            examples
          </Typography.Title>
          {result.data.examples.map((exampleId: string) => (
            <ExampleContainer key={exampleId}>
              <Typography.Title id={exampleId} level={3}>
                <RenderStatus exampleId={exampleId} status={statuses[exampleId]} />
              </Typography.Title>

              <a href="#index">top</a>
              <Divider type="vertical" />
              <Link to={`/${exampleId}`}>show</Link>

              <br />

              <Example title={false} exampleId={exampleId} onUpdate={onUpdate} />
            </ExampleContainer>
          ))}
        </>
      )}
    </>
  );
};

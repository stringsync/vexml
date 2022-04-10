import { Anchor, BackTop } from 'antd';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Format, useFetch } from '../hooks/useFetch';
import { Example } from './Example';
import { RenderStatus } from './RenderStatus';
import { VexmlStatus } from './Vexml';

const ExampleContainer = styled.div`
  padding-bottom: 24px;
`;

export const Examples: React.FC = () => {
  const result = useFetch('/manifest', Format.Json);

  const [states, setStates] = useState<Record<string, VexmlStatus>>({});
  const onUpdate = useCallback((state: VexmlStatus) => {
    setStates((statuses) => ({ ...statuses, [state.exampleId]: state }));
  }, []);

  return (
    <>
      <BackTop />

      {result.type === 'success' && (
        <>
          <Anchor affix={false}>
            {result.data.examples.map((exampleId: string) => {
              return (
                <Anchor.Link
                  key={exampleId}
                  href={`#${exampleId}`}
                  title={<RenderStatus exampleId={exampleId} status={states[exampleId]} />}
                />
              );
            })}
          </Anchor>

          <br />
          <br />

          {result.data.examples.map((exampleId: string) => (
            <ExampleContainer key={exampleId}>
              <Example exampleId={exampleId} onUpdate={onUpdate} />
            </ExampleContainer>
          ))}
        </>
      )}
    </>
  );
};

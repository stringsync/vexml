import { Anchor, Typography } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import { Format, useFetch } from '../hooks/useFetch';
import { Example } from './Example';

export const Examples: React.FC = () => {
  const result = useFetch('/manifest', Format.Json);

  return (
    <>
      {result.type === 'success' && (
        <>
          <Anchor affix={false}>
            {result.data.examples.map((exampleId: string) => (
              <Anchor.Link key={exampleId} href={`#${exampleId}`} title={exampleId} />
            ))}
          </Anchor>

          <br />
          <br />

          {result.data.examples.map((exampleId: string) => (
            <>
              <Typography.Title id={exampleId} level={3}>
                {exampleId}
              </Typography.Title>

              <Link to={`/${exampleId}`}>show</Link>

              <br />

              <Example exampleId={exampleId} />

              <br />
              <br />
            </>
          ))}
        </>
      )}
    </>
  );
};

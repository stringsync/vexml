import { Tabs } from 'antd';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Format, useFetch } from '../hooks/useFetch';
import { CodeBlock } from './CodeBlock';
import { Vexml } from './Vexml';

const { TabPane } = Tabs;

export type ExampleProps = {
  exampleId?: string;
};

export const Example: React.FC<ExampleProps> = (props) => {
  const params = useParams();
  const exampleId = props.exampleId || params.exampleId || '';

  const result = useFetch(`/public/examples/${exampleId}`, Format.Text);

  const [code, setCode] = useState('');

  return (
    <>
      {result.type === 'success' && (
        <Tabs defaultActiveKey="1">
          <TabPane tab="render" key="1">
            <Vexml xml={result.data} onCode={setCode} />
          </TabPane>
          <TabPane tab="code" key="2">
            <CodeBlock>{code}</CodeBlock>
          </TabPane>
          <TabPane tab="source" key="3">
            <CodeBlock>{result.data}</CodeBlock>
          </TabPane>
        </Tabs>
      )}
    </>
  );
};

import { Alert, Tabs, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Format, useFetch } from '../hooks/useFetch';
import { RenderStatus } from './RenderStatus';
import { Vexml, VexmlStatus } from './Vexml';

const { TabPane } = Tabs;

export type ExampleProps = {
  title?: boolean;
  exampleId?: string;
  onUpdate?: (status: VexmlStatus) => void;
};

export const Example: React.FC<ExampleProps> = (props) => {
  const params = useParams();
  const title = props.title ?? true;
  const exampleId = props.exampleId || params.exampleId || '';

  const result = useFetch(`/public/examples/${exampleId}`, Format.Text);

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<VexmlStatus | undefined>(undefined);
  const onStatus = useCallback(
    (status: VexmlStatus) => {
      setStatus(status);
      switch (status.type) {
        case 'success':
        case 'error':
          setCode(status.codePrinter.print());
      }
      props.onUpdate && props.onUpdate({ ...status, exampleId });
    },
    [exampleId, props.onUpdate]
  );

  return (
    <>
      {title && (
        <Typography.Title id={exampleId} level={2}>
          <RenderStatus exampleId={exampleId} status={status} />
        </Typography.Title>
      )}

      {result.type === 'success' && (
        <Tabs defaultActiveKey="1">
          <TabPane tab="result" key="1">
            <Vexml exampleId={exampleId} xml={result.data} onUpdate={onStatus} />
          </TabPane>
          <TabPane tab="code" key="2">
            {code && <Alert type="info" message={<pre>{code}</pre>} />}
          </TabPane>
          <TabPane tab="source" key="3">
            {code && <Alert type="info" message={<pre>{result.data}</pre>} />}
          </TabPane>
        </Tabs>
      )}
    </>
  );
};

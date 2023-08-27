import { Alert, Tabs, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Format, useFetch } from '../hooks/useFetch';
import { ExampleTitle } from './ExampleTitle';
import { Vexml } from './Vexml';
import { ExampleStatus, VexmlStatus } from '../lib/types';

const { TabPane } = Tabs;

export type ExampleProps = {
  title?: boolean;
  exampleId?: string;
  onUpdate?: (status: ExampleStatus) => void;
};

export const Example: React.FC<ExampleProps> = (props) => {
  const params = useParams();
  const title = props.title ?? true;
  const exampleId = props.exampleId || params.exampleId || '';

  const result = useFetch(`/public/examples/${exampleId}`, Format.Text);

  const [vexmlStatus, setVexmlStatus] = useState<VexmlStatus>({ type: 'init', exampleId });

  const exampleStatus = useMemo<ExampleStatus>(() => {
    switch (vexmlStatus.type) {
      case 'init':
      case 'rendering':
        return { type: 'rendering', exampleId };
      case 'success':
        return { type: 'success', elapsedMs: vexmlStatus.elapsedMs, exampleId };
      case 'error':
        return { type: 'error', error: vexmlStatus.error, elapsedMs: vexmlStatus.elapsedMs, exampleId };
    }
  }, [vexmlStatus]);

  const onUpdate = props.onUpdate;
  useEffect(() => {
    onUpdate && onUpdate(exampleStatus);
  }, [onUpdate, exampleStatus]);

  return (
    <>
      {title && (
        <Typography.Title id={exampleId} level={2}>
          <ExampleTitle exampleId={exampleId} status={exampleStatus} />
        </Typography.Title>
      )}

      <br />

      {result.type === 'success' && (
        <Tabs destroyInactiveTabPane defaultActiveKey="1">
          <TabPane tab="vexml" key="1">
            <Vexml exampleId={exampleId} xml={result.data} onUpdate={setVexmlStatus} />
          </TabPane>

          <TabPane tab="source" key="2">
            <Typography.Title level={2}>source</Typography.Title>
            {result.data && <Alert type="info" message={<pre>{result.data}</pre>} />}
          </TabPane>
        </Tabs>
      )}
    </>
  );
};

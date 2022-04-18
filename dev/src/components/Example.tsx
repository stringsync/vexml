import { CameraOutlined } from '@ant-design/icons';
import { Alert, Button, message, Tabs, Typography } from 'antd';
import React, { useCallback, useEffect, useId, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SnapshotComparisonStatus, useSnapshotComparisonStatus } from '../hooks/useComparisonStatus';
import { Format, useFetch } from '../hooks/useFetch';
import { useSnapshot } from '../hooks/useSnapshot';
import { Snapshot } from '../lib/Snapshot';
import { Diff } from './Diff';
import { ExampleTitle } from './ExampleTitle';
import { Vexml, VexmlStatus } from './Vexml';

const { TabPane } = Tabs;

export type ExampleStatus = VexmlStatus & {
  exampleId: string;
  snapshotComparisonStatus: SnapshotComparisonStatus;
};

type SnapshotStatus = { type: 'idle' } | { type: 'loading' } | { type: 'success' } | { type: 'error' };

export type ExampleProps = {
  title?: boolean;
  exampleId?: string;
  onUpdate?: (status: ExampleStatus) => void;
};

export const Example: React.FC<ExampleProps> = (props) => {
  const id = useId();
  const params = useParams();
  const title = props.title ?? true;
  const exampleId = props.exampleId || params.exampleId || '';

  const [svg, setSvg] = useState<SVGElement | null>(null);
  const [serverSnapshotStatus, setServerSnapshotStatus] = useState<SnapshotStatus>({ type: 'idle' });
  const onSnapshotClick = useCallback<React.MouseEventHandler<HTMLElement>>(async () => {
    if (!svg) {
      return;
    }
    setServerSnapshotStatus({ type: 'loading' });
    try {
      const url = Snapshot.url(exampleId);
      const snapshot = await Snapshot.fromSvg(svg);
      await snapshot.upload(url);
      message.success(`${url} uploaded`);
      setServerSnapshotStatus({ type: 'success' });
    } catch (e) {
      setServerSnapshotStatus({ type: 'error' });
      message.error(String(e));
    }
  }, [exampleId, svg]);
  const isSnapshotLoading = serverSnapshotStatus.type === 'loading';
  const isSnapshotDisabled = !svg || serverSnapshotStatus.type === 'loading';
  const [vexmlRenderingSnapshot] = useSnapshot(svg);
  const [serverSnapshot, refetchServerSnapshot] = useSnapshot(Snapshot.url(exampleId));
  useEffect(() => {
    switch (serverSnapshotStatus.type) {
      case 'success':
      case 'error':
        refetchServerSnapshot();
        break;
    }
  }, [serverSnapshotStatus, refetchServerSnapshot]);

  const result = useFetch(`/public/examples/${exampleId}`, Format.Text);

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<ExampleStatus | undefined>(undefined);
  const snapshotComparisonStatus = useSnapshotComparisonStatus(vexmlRenderingSnapshot, serverSnapshot);
  const onUpdate = props.onUpdate;
  const onStatus = useCallback(
    (vexmlStatus: VexmlStatus) => {
      const status: ExampleStatus = { ...vexmlStatus, exampleId, snapshotComparisonStatus };
      setStatus(status);
      switch (vexmlStatus.type) {
        case 'success':
          setCode(vexmlStatus.codePrinter.print());
          setSvg(vexmlStatus.svg);
          break;
        case 'error':
          setCode(vexmlStatus.codePrinter.print());
          break;
      }
      onUpdate && onUpdate(status);
    },
    [id, exampleId, snapshotComparisonStatus, onUpdate]
  );

  return (
    <>
      {title && (
        <Typography.Title id={exampleId} level={2}>
          <ExampleTitle exampleId={exampleId} status={status} />
        </Typography.Title>
      )}

      <br />

      <Button
        type="primary"
        icon={<CameraOutlined />}
        onClick={onSnapshotClick}
        disabled={isSnapshotDisabled}
        loading={isSnapshotLoading}
      >
        snapshot
      </Button>

      {result.type === 'success' && (
        <Tabs defaultActiveKey="1">
          <TabPane tab="vexml" key="1">
            <Typography.Title level={2}>vexml</Typography.Title>
            <Vexml exampleId={exampleId} xml={result.data} onUpdate={onStatus} />
          </TabPane>
          <TabPane tab="snapshot" key="2">
            <Typography.Title level={2}>snapshot</Typography.Title>
            {!serverSnapshot && <Typography.Text type="warning">no snapshot taken</Typography.Text>}
            {serverSnapshotStatus.type === 'loading' && <Typography.Text type="secondary">loading</Typography.Text>}
            {serverSnapshotStatus.type !== 'loading' && serverSnapshot && <img src={Snapshot.url(exampleId)} />}
          </TabPane>
          <TabPane tab="diff" key="3" forceRender={false}>
            <Typography.Title level={2}>diff</Typography.Title>
            {(serverSnapshotStatus.type === 'loading' || !vexmlRenderingSnapshot) && (
              <Typography.Text type="secondary">loading</Typography.Text>
            )}
            {serverSnapshotStatus.type !== 'loading' && vexmlRenderingSnapshot && !serverSnapshot && (
              <Typography.Text type="warning">no snapshot taken</Typography.Text>
            )}
            {vexmlRenderingSnapshot && serverSnapshot && <Diff snapshotComparisonStatus={snapshotComparisonStatus} />}
          </TabPane>
          <TabPane tab="code" key="4">
            <Typography.Title level={2}>code</Typography.Title>
            {code && <Alert type="info" message={<pre>{code}</pre>} />}
          </TabPane>
          <TabPane tab="source" key="5">
            <Typography.Title level={2}>source</Typography.Title>
            {code && <Alert type="info" message={<pre>{result.data}</pre>} />}
          </TabPane>
        </Tabs>
      )}
    </>
  );
};

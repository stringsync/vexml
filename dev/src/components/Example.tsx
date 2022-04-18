import { CameraOutlined } from '@ant-design/icons';
import { Alert, Button, message, Tabs, Typography } from 'antd';
import React, { useCallback, useEffect, useId, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Format, useFetch } from '../hooks/useFetch';
import { useSnapshot } from '../hooks/useSnapshot';
import { Snapshot } from '../lib/Snapshot';
import { Diff } from './Diff';
import { RenderStatus } from './RenderStatus';
import { Vexml, VexmlStatus } from './Vexml';

const { TabPane } = Tabs;

const getSnapshotUrl = (exampleId: string) => `/public/snapshots/${Snapshot.filename(exampleId)}`;

export type ExampleProps = {
  title?: boolean;
  exampleId?: string;
  onUpdate?: (status: VexmlStatus) => void;
};

type SnapshotStatus = { type: 'idle' } | { type: 'loading' } | { type: 'success' } | { type: 'error' };

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
      const filename = Snapshot.filename(exampleId);
      const snapshot = await Snapshot.fromSvg(svg);
      await snapshot.upload(filename);
      message.success(`${filename} uploaded`);
      setServerSnapshotStatus({ type: 'success' });
    } catch (e) {
      setServerSnapshotStatus({ type: 'error' });
      message.error(String(e));
    }
  }, [exampleId, svg]);
  const isSnapshotLoading = serverSnapshotStatus.type === 'loading';
  const isSnapshotDisabled = !svg || serverSnapshotStatus.type === 'loading';
  const [vexmlRenderingSnapshot] = useSnapshot(svg);
  const [serverSnapshot, refetchServerSnapshot] = useSnapshot(getSnapshotUrl(exampleId));
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
  const [status, setStatus] = useState<VexmlStatus | undefined>(undefined);
  const onStatus = useCallback(
    (status: VexmlStatus) => {
      setStatus(status);
      switch (status.type) {
        case 'success':
          setCode(status.codePrinter.print());
          setSvg(status.svg);
          break;
        case 'error':
          setCode(status.codePrinter.print());
          break;
      }
      props.onUpdate && props.onUpdate({ ...status, exampleId });
    },
    [id, exampleId, props.onUpdate]
  );

  return (
    <>
      {title && (
        <Typography.Title id={exampleId} level={2}>
          <RenderStatus exampleId={exampleId} status={status} />
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
            {serverSnapshotStatus.type !== 'loading' && serverSnapshot && <img src={getSnapshotUrl(exampleId)} />}
          </TabPane>
          <TabPane tab="diff" key="3" forceRender={false}>
            <Typography.Title level={2}>diff</Typography.Title>
            {(serverSnapshotStatus.type === 'loading' || !vexmlRenderingSnapshot) && (
              <Typography.Text type="secondary">loading</Typography.Text>
            )}
            {serverSnapshotStatus.type !== 'loading' && vexmlRenderingSnapshot && !serverSnapshot && (
              <Typography.Text type="warning">no snapshot taken</Typography.Text>
            )}
            {vexmlRenderingSnapshot && serverSnapshot && (
              <Diff snapshot1={vexmlRenderingSnapshot} snapshot2={serverSnapshot} />
            )}
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

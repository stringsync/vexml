import { CameraOutlined } from '@ant-design/icons';
import { Alert, Button, message, Tabs, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExampleStatus, useExampleStatus } from '../hooks/useExampleStatus';
import { Format, useFetch } from '../hooks/useFetch';
import { useSnapshot } from '../hooks/useSnapshot';
import { useSnapshotComparisonStatus } from '../hooks/useSnapshotComparisonStatus';
import { Snapshot } from '../lib/Snapshot';
import { Diff } from './Diff';
import { ExampleTitle } from './ExampleTitle';
import { Vexml, VexmlStatus } from './Vexml';

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

  const [svg, setSvg] = useState<SVGElement | null>(null);
  const [vexmlSnapshotStatus] = useSnapshot(svg);
  const [serverSnapshotStatus, refetchServerSnapshot] = useSnapshot(Snapshot.url(exampleId));
  const vexmlSnapshot = vexmlSnapshotStatus.type === 'success' ? vexmlSnapshotStatus.snapshot : null;
  const serverSnapshot = serverSnapshotStatus.type === 'success' ? serverSnapshotStatus.snapshot : null;
  useEffect(() => {
    if (!svg) {
      return;
    }
    if (serverSnapshotStatus.type === 'error') {
      // automatically take server snapshot if missing
      const url = Snapshot.url(exampleId);
      Snapshot.fromSvg(svg)
        .then((snapshot) => snapshot.upload(url))
        .then(() => refetchServerSnapshot());
    }
  }, [exampleId, serverSnapshotStatus, svg, refetchServerSnapshot]);
  const [isUploading, setIsUploading] = useState(false);
  const onSnapshotClick = useCallback<React.MouseEventHandler<HTMLElement>>(async () => {
    if (!vexmlSnapshot) {
      return;
    }
    try {
      const url = Snapshot.url(exampleId);
      setIsUploading(true);
      await vexmlSnapshot.upload(url);
      message.success(`${url} uploaded`);
    } catch (e) {
      message.error(String(e));
    } finally {
      setIsUploading(false);
    }
  }, [exampleId, vexmlSnapshot]);
  const isServerSnapshotLoading = isUploading || serverSnapshotStatus.type === 'loading';
  const isSnapshotButtonDisabled = !svg || isUploading || serverSnapshotStatus.type === 'loading';

  const [code, setCode] = useState('');
  const [vexmlStatus, setVexmlStatus] = useState<VexmlStatus>({ type: 'init', exampleId });
  const snapshotComparisonStatus = useSnapshotComparisonStatus(vexmlSnapshot, serverSnapshot);
  const exampleStatus = useExampleStatus(exampleId, vexmlStatus, snapshotComparisonStatus);
  const onUpdate = props.onUpdate;
  useEffect(() => {
    switch (exampleStatus.type) {
      case 'init':
        break;
      case 'rendering':
        break;
      case 'snapshotting':
        setCode(exampleStatus.codePrinter.print());
        setSvg(exampleStatus.svg);
        break;
      case 'success':
        break;
      case 'error':
        setCode(exampleStatus.codePrinter.print());
        break;
    }
    onUpdate && onUpdate(exampleStatus);
  }, [exampleStatus]);

  return (
    <>
      {title && (
        <Typography.Title id={exampleId} level={2}>
          <ExampleTitle exampleId={exampleId} status={exampleStatus} />
        </Typography.Title>
      )}

      <br />

      <Button
        type="primary"
        icon={<CameraOutlined />}
        onClick={onSnapshotClick}
        disabled={isSnapshotButtonDisabled}
        loading={isServerSnapshotLoading}
      >
        snapshot
      </Button>

      {result.type === 'success' && (
        <Tabs defaultActiveKey="1">
          <TabPane tab="vexml" key="1">
            <Typography.Title level={2}>vexml</Typography.Title>
            <Vexml exampleId={exampleId} xml={result.data} onUpdate={setVexmlStatus} />
          </TabPane>
          <TabPane tab="snapshot" key="2">
            <Typography.Title level={2}>snapshot</Typography.Title>
            {!serverSnapshotStatus && <Typography.Text type="warning">no snapshot taken</Typography.Text>}
            {serverSnapshotStatus.type === 'loading' && <Typography.Text type="secondary">loading</Typography.Text>}
            {serverSnapshotStatus.type !== 'loading' && serverSnapshotStatus && <img src={Snapshot.url(exampleId)} />}
          </TabPane>
          <TabPane tab="diff" key="3" forceRender={false}>
            <Typography.Title level={2}>diff</Typography.Title>
            {(serverSnapshotStatus.type === 'loading' || !vexmlSnapshotStatus) && (
              <Typography.Text type="secondary">loading</Typography.Text>
            )}
            {serverSnapshotStatus.type !== 'loading' && vexmlSnapshotStatus && !serverSnapshotStatus && (
              <Typography.Text type="warning">no snapshot taken</Typography.Text>
            )}
            {vexmlSnapshotStatus && serverSnapshotStatus && (
              <Diff snapshotComparisonStatus={snapshotComparisonStatus} />
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

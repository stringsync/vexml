import { CheckCircleTwoTone, CloseCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import { Divider } from 'antd';
import React from 'react';
import { VexmlStatus } from './Vexml';

type StatusIconProps = {
  status: VexmlStatus | undefined;
};

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  return (
    <>
      {!status && <LoadingOutlined />}
      {status && status.type === 'rendering' && <LoadingOutlined />}
      {status && status.type === 'success' && <CheckCircleTwoTone twoToneColor="#52c41a" />}
      {status && status.type === 'error' && <CloseCircleTwoTone twoToneColor="#eb2f45" />}
    </>
  );
};

export type RenderStatusProps = {
  exampleId: string;
  status: VexmlStatus | undefined;
};

export const RenderStatus: React.FC<RenderStatusProps> = (props) => {
  const { exampleId, status: state } = props;

  return (
    <>
      <StatusIcon status={state} />
      <Divider type="vertical" />
      {exampleId}
      {state && (state.type === 'success' || state.type === 'error') && (
        <>
          <Divider type="vertical" />
          {`(${state.elapsedMs} ms)`}
        </>
      )}
    </>
  );
};

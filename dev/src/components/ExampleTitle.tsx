import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ExclamationCircleTwoTone,
  LoadingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Divider } from 'antd';
import React from 'react';
import { ExampleStatus } from '../hooks/useExampleStatus';

type StatusIconProps = {
  status: ExampleStatus | undefined;
};

const isLoading = (status: ExampleStatus | undefined): boolean =>
  !status || status.type === 'init' || status.type === 'rendering' || status.type === 'snapshotting';

const isErrored = (status: ExampleStatus | undefined): boolean => !!status && status.type === 'error';

const isCompletelySuccessful = (status: ExampleStatus | undefined): boolean =>
  !!status && status.type === 'success' && status.comparison.match === 1;

const isPartiallySuccessful = (status: ExampleStatus | undefined): boolean =>
  !!status && status.type === 'success' && status.comparison.match < 1;

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  if (isLoading(status)) {
    return <LoadingOutlined />;
  } else if (isErrored(status)) {
    return <CloseCircleTwoTone twoToneColor="#eb2f45" />;
  } else if (isCompletelySuccessful(status)) {
    return <CheckCircleTwoTone twoToneColor="#52c41a" />;
  } else if (isPartiallySuccessful(status)) {
    return <ExclamationCircleTwoTone twoToneColor="#c4b91a" />;
  } else {
    return <QuestionCircleOutlined />;
  }
};

export type ExampleTitleProps = {
  exampleId: string;
  status: ExampleStatus | undefined;
};

export const ExampleTitle: React.FC<ExampleTitleProps> = (props) => {
  const { exampleId, status } = props;

  return (
    <>
      <StatusIcon status={status} />
      <Divider type="vertical" />
      {exampleId}
      {status && (status.type === 'success' || status.type === 'error') && (
        <>
          <Divider type="vertical" />
          {`(${status.elapsedMs} ms)`}
        </>
      )}
      {status && status.type === 'success' && (
        <>
          <Divider type="vertical" />
          {`(${Math.floor(status.comparison.match * 100)}%)`}
        </>
      )}
    </>
  );
};

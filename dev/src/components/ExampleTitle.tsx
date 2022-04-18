import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ExclamationCircleTwoTone,
  LoadingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Divider } from 'antd';
import React from 'react';
import { ExampleStatus } from './Example';

type StatusIconProps = {
  status: ExampleStatus | undefined;
};

const isLoading = (status: ExampleStatus | undefined): boolean =>
  !status || status.type === 'rendering' || status.snapshotComparisonStatus.type === 'loading';

const isErrored = (status: ExampleStatus | undefined): boolean => !!status && status.type === 'error';

const isCompletelySuccessful = (status: ExampleStatus | undefined): boolean =>
  !!status &&
  status.type === 'success' &&
  status.snapshotComparisonStatus.type === 'success' &&
  status.snapshotComparisonStatus.comparison.match === 1;

const isPartiallySuccessful = (status: ExampleStatus | undefined): boolean =>
  !!status &&
  status.type === 'success' &&
  (status.snapshotComparisonStatus.type === 'error' ||
    status.snapshotComparisonStatus.type === 'none' ||
    (status.snapshotComparisonStatus.type === 'success' && status.snapshotComparisonStatus.comparison.match < 1));

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
          {status.snapshotComparisonStatus.type === 'success' &&
            `(${Math.floor(status.snapshotComparisonStatus.comparison.match * 100)}%)`}
        </>
      )}
    </>
  );
};

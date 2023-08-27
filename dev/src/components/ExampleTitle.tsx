import { CheckCircleTwoTone, CloseCircleTwoTone, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Divider } from 'antd';
import React from 'react';
import { ExampleStatus } from '../lib/types';

type StatusIconProps = {
  status: ExampleStatus | undefined;
};

const isLoading = (status: ExampleStatus | undefined): boolean =>
  !status || status.type === 'init' || status.type === 'rendering';

const isErrored = (status: ExampleStatus | undefined): boolean => !!status && status.type === 'error';

const isSuccessful = (status: ExampleStatus | undefined): boolean => !!status && status.type === 'success';

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  if (isLoading(status)) {
    return <LoadingOutlined />;
  } else if (isErrored(status)) {
    return <CloseCircleTwoTone twoToneColor="#eb2f45" />;
  } else if (isSuccessful(status)) {
    return <CheckCircleTwoTone twoToneColor="#52c41a" />;
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
    </>
  );
};

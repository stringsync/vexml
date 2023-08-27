import { Col, Row, Statistic } from 'antd';
import React, { useMemo } from 'react';
import { ExampleStatus } from '../lib/types';

const BAD_COLOR = '#cf1322';
const GOOD_COLOR = '#3f8600';

export type StatusSummaryProps = {
  exampleIds: string[];
  statuses: Record<string, ExampleStatus>;
};

export const StatusSummary: React.FC<StatusSummaryProps> = (props) => {
  const { exampleIds, statuses } = props;
  const stats = useMemo(
    () => ({
      num: exampleIds.length,
      numSuccess: Object.values(statuses).filter((status) => status.type === 'success').length,
      numFailed: Object.values(statuses).filter((status) => status.type === 'error').length,
    }),
    [exampleIds, statuses]
  );

  const progress = ((stats.numSuccess + stats.numFailed) / stats.num) * 100;
  const loading = progress < 100;

  return (
    <Row gutter={24}>
      <Col>
        <Statistic title="total" value={stats.num} />{' '}
      </Col>
      <Col>
        <Statistic title="progress" suffix="%" precision={0} value={progress} />
      </Col>
      <Col>
        <Statistic
          title="success"
          value={stats.numSuccess}
          valueStyle={{ color: loading ? '#000' : stats.numSuccess === 0 ? BAD_COLOR : GOOD_COLOR }}
        />
      </Col>
      <Col>
        <Statistic
          title="failed"
          value={stats.numFailed}
          valueStyle={{ color: loading ? '#000' : stats.numFailed > 0 ? BAD_COLOR : GOOD_COLOR }}
        />
      </Col>
    </Row>
  );
};

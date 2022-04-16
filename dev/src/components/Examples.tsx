import { Checkbox, Divider, Typography } from 'antd';
import { CheckboxValueType } from 'antd/lib/checkbox/Group';
import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useConstant } from '../hooks/useConstant';
import { Format, useFetch } from '../hooks/useFetch';
import { AlphabeticalIndex } from './AlphabeticalIndex';
import { Example } from './Example';
import { RenderStatus } from './RenderStatus';
import { VexmlStatus } from './Vexml';

const NUM_SLOWEST_VISIBLE = 10;

const ExampleContainer = styled.div<{ visible: boolean }>`
  display: ${(props) => (props.visible ? 'block' : 'none')};
  padding-bottom: 24px;
`;

const StyledListItem = styled.li`
  border-radius: 4px;
  padding-left: 4px;

  :hover {
    background-color: #eee;
  }
`;

export const Examples: React.FC = () => {
  const result = useFetch('/manifest', Format.Json);

  const [statuses, setStatuses] = useState<Record<string, VexmlStatus>>({});
  const loading = useMemo(() => {
    switch (result.type) {
      case 'idle':
        return true;
      case 'loading':
        return true;
      case 'error':
        return false;
      case 'success':
        return result.data.examples.some((exampleId: string) => !(exampleId in statuses));
    }
  }, [statuses, result]);
  const onUpdate = useCallback((state: VexmlStatus) => {
    setStatuses((statuses) => ({ ...statuses, [state.exampleId]: state }));
  }, []);

  const renderExampleStatus = useCallback(
    (exampleId: string) => {
      return (
        <>
          <RenderStatus exampleId={exampleId} status={statuses[exampleId]} />
          <Divider type="vertical" />
          <a href={`#${exampleId}`}>jump</a>
          <Divider type="vertical" />
          <Link to={`/${exampleId}`}>show</Link>
        </>
      );
    },
    [statuses]
  );

  const [successVisible, setSuccessVisible] = useState(true);
  const [failVisible, setFailVisible] = useState(true);
  const [slowestVisible, setSlowestVisible] = useState(false);
  const options = useMemo(() => {
    const numSuccess = Object.values(statuses).filter((status) => status.type === 'success').length;
    const numFailed = Object.values(statuses).filter((status) => status.type === 'error').length;
    return [
      {
        label: `success (${numSuccess})`,
        value: 'success',
        disabled: successVisible && successVisible !== failVisible,
      },
      {
        label: `failed (${numFailed})`,
        value: 'fail',
        disabled: failVisible && successVisible !== failVisible,
      },
      {
        label: `slowest (${Math.min(Object.keys(statuses).length, NUM_SLOWEST_VISIBLE)})`,
        value: 'slowest',
      },
    ];
  }, [successVisible, failVisible, statuses]);
  const defaultFilters = useConstant(() => ['success', 'fail']);
  const onFiltersChange = useCallback((checkedValues: CheckboxValueType[]): void => {
    setSuccessVisible(checkedValues.includes('success'));
    setFailVisible(checkedValues.includes('fail'));
    setSlowestVisible(checkedValues.includes('slowest'));
  }, []);
  const filteredExampleIds = useMemo<string[]>(() => {
    if (result.type !== 'success') {
      return [];
    }
    const examples: string[] = slowestVisible
      ? result.data.examples
          .slice()
          .sort((a: string, b: string) => {
            const aStatus = statuses[a];
            const bStatus = statuses[b];
            const aMs = aStatus && aStatus.type === 'success' ? aStatus.elapsedMs : Number.NEGATIVE_INFINITY;
            const bMs = bStatus && bStatus.type === 'success' ? bStatus.elapsedMs : Number.NEGATIVE_INFINITY;
            return bMs - aMs;
          })
          .slice(0, NUM_SLOWEST_VISIBLE)
      : result.data.examples;
    return examples.filter(
      (exampleId) =>
        typeof statuses[exampleId] === 'undefined' || // it's still loading
        statuses[exampleId].type === 'rendering' ||
        (statuses[exampleId].type === 'success' && successVisible) ||
        (statuses[exampleId].type === 'error' && failVisible)
    );
  }, [result, slowestVisible, successVisible, failVisible, statuses]);
  const filteredExampleIdsSet = useMemo(() => new Set(filteredExampleIds), [filteredExampleIds]);

  return (
    <>
      {result.type === 'success' && (
        <>
          <Typography.Title id="index" level={2}>
            index
          </Typography.Title>

          <Typography.Title level={3}>filters</Typography.Title>
          <Checkbox.Group
            options={options}
            defaultValue={defaultFilters}
            onChange={onFiltersChange}
            disabled={loading}
          />

          <br />
          <br />

          {slowestVisible ? (
            <ol>
              {filteredExampleIds.map((exampleId) => (
                <StyledListItem key={exampleId}>{renderExampleStatus(exampleId)}</StyledListItem>
              ))}
            </ol>
          ) : (
            <AlphabeticalIndex keys={filteredExampleIds} renderKey={renderExampleStatus} />
          )}

          <Divider />

          <Typography.Title id="examples" level={2}>
            examples
          </Typography.Title>
          {result.data.examples.map((exampleId: string) => (
            <ExampleContainer key={exampleId} visible={filteredExampleIdsSet.has(exampleId)}>
              <Typography.Title id={exampleId} level={3}>
                <RenderStatus exampleId={exampleId} status={statuses[exampleId]} />
              </Typography.Title>

              <a href="#index">top</a>
              <Divider type="vertical" />
              <Link to={`/${exampleId}`}>show</Link>

              <br />

              <Example title={false} exampleId={exampleId} onUpdate={onUpdate} />
            </ExampleContainer>
          ))}
        </>
      )}
    </>
  );
};

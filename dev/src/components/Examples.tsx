import { Checkbox, Divider, Typography } from 'antd';
import { CheckboxValueType } from 'antd/lib/checkbox/Group';
import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useConstant } from '../hooks/useConstant';
import { Format, useFetch } from '../hooks/useFetch';
import { useSettings } from '../hooks/useSettings';
import { AlphabeticalIndex } from './AlphabeticalIndex';
import { Example } from './Example';
import { RenderStatus } from './RenderStatus';
import { StatusSummary } from './StatusSummary';
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

  const [settings, updateSettings] = useSettings();

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

  const options = useMemo(() => {
    return [
      {
        label: 'success',
        value: 'success',
        disabled:
          settings.slowestVisible || (settings.successVisible && settings.successVisible !== settings.failVisible),
      },
      {
        label: 'failed',
        value: 'failed',
        disabled: settings.failVisible && settings.successVisible !== settings.failVisible,
      },
      {
        label: 'slowest',
        value: 'slowest',
        disabled: !settings.successVisible,
      },
    ];
  }, [settings]);
  const defaultFilters = useConstant(() => {
    const defaultFilters = new Array<string>();
    if (settings.successVisible) {
      defaultFilters.push('success');
    }
    if (settings.failVisible) {
      defaultFilters.push('failed');
    }
    if (settings.slowestVisible) {
      defaultFilters.push('slowest');
    }
    return defaultFilters;
  });
  const onFiltersChange = useCallback(
    (checkedValues: CheckboxValueType[]): void => {
      updateSettings({
        ...settings,
        successVisible: checkedValues.includes('success'),
        failVisible: checkedValues.includes('failed'),
        slowestVisible: checkedValues.includes('slowest'),
      });
    },
    [updateSettings]
  );
  const filteredExampleIds = useMemo<string[]>(() => {
    if (result.type !== 'success') {
      return [];
    }
    const examples: string[] = settings.slowestVisible
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
        (statuses[exampleId].type === 'success' && settings.successVisible) ||
        (statuses[exampleId].type === 'error' && settings.failVisible)
    );
  }, [result, settings, statuses]);
  const filteredExampleIdsSet = useMemo(() => new Set(filteredExampleIds), [filteredExampleIds]);

  return (
    <>
      {result.type === 'success' && (
        <>
          <Typography.Title id="index" level={2}>
            index
          </Typography.Title>

          <Typography.Title level={3}>stats</Typography.Title>
          <StatusSummary exampleIds={result.data.examples} statuses={statuses} />

          <br />
          <br />

          <Typography.Title level={3}>filters</Typography.Title>
          <Checkbox.Group
            options={options}
            defaultValue={defaultFilters}
            onChange={onFiltersChange}
            disabled={loading}
          />

          <br />
          <br />

          {loading && <Typography.Text type="secondary">loading</Typography.Text>}
          {!loading && settings.slowestVisible && (
            <ol>
              {filteredExampleIds.map((exampleId) => (
                <StyledListItem key={exampleId}>{renderExampleStatus(exampleId)}</StyledListItem>
              ))}
            </ol>
          )}
          {!loading && !settings.slowestVisible && (
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

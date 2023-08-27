import { Alert, Divider } from 'antd';
import React, { useEffect, useId, useState } from 'react';
import styled from 'styled-components';
import { vexml } from '../lib/vexml';
import { VexmlStatus } from '../lib/types';

const BlackDivider = styled(Divider)`
  &.ant-divider-horizontal.ant-divider-with-text {
    border-top-color: black;
  }
`;

const getErrorMessage = (e: any) => (e instanceof Error ? e.stack || e.message : `something went wrong: ${e}`);

export type VexmlProps = {
  exampleId: string;
  xml: string;
  onUpdate?: (status: VexmlStatus) => void;
};

export const Vexml: React.FC<VexmlProps> = (props) => {
  const { xml, exampleId, onUpdate: onStateChange } = props;

  const id = useId();

  const [status, setStatus] = useState<VexmlStatus>({ type: 'rendering', exampleId });
  const success = (elapsedMs: number) => setStatus({ type: 'success', exampleId, elapsedMs });
  const error = (e: any, elapsedMs: number) =>
    setStatus({ type: 'error', exampleId, error: getErrorMessage(e), elapsedMs });

  const [width, setWidth] = useState(0);
  useEffect(() => {
    const div = document.getElementById(id);
    if (!div) {
      setWidth(0);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === 'number') {
        setWidth(width);
      }
    });

    observer.observe(div);

    return () => {
      observer.disconnect();
    };
  }, [id]);

  useEffect(() => {
    const start = new Date().getTime();

    const div = document.getElementById(id);
    if (!(div instanceof HTMLDivElement)) {
      return;
    }

    if (width === 0) {
      return;
    }

    div.firstChild?.remove();

    try {
      vexml.Vexml.render({ element: div, xml, width });
      const stop = new Date().getTime();
      success(stop - start);
    } catch (e) {
      const stop = new Date().getTime();
      error(e, stop - start);
    }
  }, [id, width, xml]);

  useEffect(() => {
    onStateChange && onStateChange(status);
  }, [status, onStateChange]);

  return (
    <>
      <div>
        <BlackDivider plain orientation="left">
          {width}px
        </BlackDivider>
      </div>

      <br />

      {status.type === 'error' && <Alert type="error" message={<pre>{status.error}</pre>} />}
      <div id={id} data-screenshot-ready={status.type === 'success'} />
    </>
  );
};

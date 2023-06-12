import { Alert, Divider } from 'antd';
import React, { useEffect, useId, useState } from 'react';
import styled from 'styled-components';
import { vexml } from '../lib/vexml';

const DEFAULT_WIDTH = 2000;

const FixedDiv = styled.div<{ width: number }>`
  width: ${(props) => props.width}px;
`;

const BlackDivider = styled(Divider)`
  &.ant-divider-horizontal.ant-divider-with-text {
    border-top-color: black;
  }
`;

export type VexmlStatus =
  | {
      type: 'init';
      exampleId: string;
    }
  | {
      type: 'rendering';
      exampleId: string;
    }
  | {
      type: 'success';
      svg: SVGElement;
      exampleId: string;
      elapsedMs: number;
    }
  | {
      type: 'error';
      elapsedMs: number;
      exampleId: string;
      error: any;
    };

const getErrorMessage = (e: any) => (e instanceof Error ? e.stack || e.message : `something went wrong: ${e}`);

export type VexmlProps = {
  exampleId: string;
  responsive: boolean;
  xml: string;
  onUpdate?: (status: VexmlStatus) => void;
};

export const Vexml: React.FC<VexmlProps> = (props) => {
  const { xml, exampleId, responsive, onUpdate: onStateChange } = props;

  const id = useId();

  const [status, setStatus] = useState<VexmlStatus>({ type: 'rendering', exampleId });
  const success = (svg: SVGElement, elapsedMs: number) => setStatus({ type: 'success', svg, exampleId, elapsedMs });
  const error = (e: any, elapsedMs: number) =>
    setStatus({ type: 'error', exampleId, error: getErrorMessage(e), elapsedMs });

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    if (!responsive) {
      setWidth(DEFAULT_WIDTH);
      return;
    }

    const div = document.getElementById(id);
    if (!div) {
      setWidth(DEFAULT_WIDTH);
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
  }, [id, responsive]);

  useEffect(() => {
    const start = new Date().getTime();

    const div = document.getElementById(id);
    if (!(div instanceof HTMLDivElement)) {
      return;
    }

    div.firstChild?.remove();

    try {
      vexml.Vexml.render({ element: div, xml, width });
      const stop = new Date().getTime();
      const svg = document.getElementById(id)!.firstChild as SVGElement;
      success(svg, stop - start);
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
      <FixedDiv width={width}>
        <BlackDivider plain orientation="left">
          {width}px
        </BlackDivider>
      </FixedDiv>

      <br />

      {status.type === 'error' && <Alert type="error" message={<pre>{status.error}</pre>} />}
      <div id={id} />
    </>
  );
};

import { Alert } from 'antd';
import React, { useEffect, useId, useState } from 'react';
import { vexml } from '../lib/vexml';

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
  xml: string;
  onUpdate?: (status: VexmlStatus) => void;
};

export const Vexml: React.FC<VexmlProps> = (props) => {
  const { xml, exampleId, onUpdate: onStateChange } = props;

  const id = useId();

  const [status, setStatus] = useState<VexmlStatus>({ type: 'rendering', exampleId });
  const success = (svg: SVGElement, elapsedMs: number) => setStatus({ type: 'success', svg, exampleId, elapsedMs });
  const error = (e: any, elapsedMs: number) =>
    setStatus({ type: 'error', exampleId, error: getErrorMessage(e), elapsedMs });

  useEffect(() => {
    const start = new Date().getTime();
    try {
      vexml.Vexml.render({ elementId: id, xml, width: 2000, height: 400 });
      const stop = new Date().getTime();
      const svg = document.getElementById(id)!.firstChild! as SVGElement;
      success(svg, stop - start);
    } catch (e) {
      const stop = new Date().getTime();
      error(e, stop - start);
    }
  }, [id, xml]);

  useEffect(() => {
    onStateChange && onStateChange(status);
  }, [status, onStateChange]);

  return (
    <>
      {status.type !== 'error' && <div id={id} />}
      {status.type === 'error' && <Alert type="error" message={<pre>{status.error}</pre>} />}
    </>
  );
};

import { Alert } from 'antd';
import React, { useEffect, useId, useState } from 'react';
import { useConstant } from '../hooks/useConstant';
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
      codePrinter: vexml.CodePrinter;
    }
  | {
      type: 'error';
      elapsedMs: number;
      exampleId: string;
      error: any;
      codePrinter: vexml.CodePrinter;
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
  const codePrinter = useConstant(() => new vexml.CodePrinter());
  const success = (svg: SVGElement, elapsedMs: number) =>
    setStatus({ type: 'success', svg, exampleId, elapsedMs, codePrinter });
  const error = (e: any, elapsedMs: number) =>
    setStatus({ type: 'error', exampleId, error: getErrorMessage(e), codePrinter, elapsedMs });

  useEffect(() => {
    const start = new Date().getTime();
    try {
      vexml.Vexml.render(id, xml, { codeTracker: codePrinter });
      const stop = new Date().getTime();
      const svg = document.getElementById(id)!.firstChild! as SVGElement;
      success(svg, stop - start);
    } catch (e) {
      const stop = new Date().getTime();
      error(e, stop - start);
    }
  }, [id, xml, codePrinter]);

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

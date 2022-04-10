import { Alert } from 'antd';
import React, { useEffect, useId, useState } from 'react';
import { vexml } from '../lib/vexml';

export type VexmlStatus =
  | {
      type: 'rendering';
      exampleId: string;
    }
  | {
      type: 'success';
      exampleId: string;
      elapsedMs: number;
      codePrinter: vexml.CodePrinter;
    }
  | {
      type: 'error';
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
  const [codePrinter] = useState(() => new vexml.CodePrinter());
  const success = (elapsedMs: number) => setStatus({ type: 'success', exampleId, elapsedMs, codePrinter });
  const error = (e: any) => setStatus({ type: 'error', exampleId, error: getErrorMessage(e), codePrinter });

  useEffect(() => {
    const start = new Date().getTime();
    try {
      vexml.Renderer.render(id, xml, { codeTracker: codePrinter });
      const stop = new Date().getTime();
      success(stop - start);
    } catch (e) {
      error(e);
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

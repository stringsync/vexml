import React, { useEffect, useId, useState } from 'react';
import { vexml } from '../lib/vexml';
import { CodeBlock } from './CodeBlock';

type RenderStatus =
  | {
      type: 'rendering';
    }
  | {
      type: 'success';
      elapsedMs: number;
    }
  | {
      type: 'error';
      error: any;
    };

const getErrorMessage = (e: any) => (e instanceof Error ? e.stack || e.message : `something went wrong: ${e}`);

export type VexmlProps = {
  xml: string;
  onCode?: (code: string) => void;
};

export const Vexml: React.FC<VexmlProps> = (props) => {
  const { xml, onCode } = props;

  const id = useId();

  const [status, setStatus] = useState<RenderStatus>({ type: 'rendering' });
  const success = (elapsedMs: number) => setStatus({ type: 'success', elapsedMs });
  const error = (e: any) => setStatus({ type: 'error', error: getErrorMessage(e) });

  useEffect(() => {
    const start = new Date().getTime();
    try {
      const codePrinter = new vexml.CodePrinter();
      vexml.Renderer.render(id, xml, { codeTracker: codePrinter });
      const stop = new Date().getTime();
      success(stop - start);
      onCode && onCode(codePrinter.print());
    } catch (e) {
      error(e);
    }
  }, [id, xml, onCode]);

  return (
    <>
      <small>
        {status.type} {status.type === 'success' && `(${status.elapsedMs} ms)`}
      </small>

      <br />
      <br />

      {status.type !== 'error' && <div id={id} />}
      {status.type === 'error' && <CodeBlock>{status.error}</CodeBlock>}
    </>
  );
};

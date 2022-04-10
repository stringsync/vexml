import React, { useEffect, useId } from 'react';
import { vexml } from '../lib/vexml';

export type VexmlProps = {
  xml: string;
  onCode?: (code: string) => void;
};

export const Vexml: React.FC<VexmlProps> = (props) => {
  const { xml, onCode } = props;
  const id = useId();

  useEffect(() => {
    vexml.Renderer.render(id, xml);
    if (onCode) {
      onCode('// TODO');
    }
  }, [id, xml, onCode]);

  return <div id={id} />;
};

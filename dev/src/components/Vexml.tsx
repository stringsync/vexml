import React from 'react';

export type VexmlProps = {
  xml: string;
  onCode(code: string): void;
};

export const Vexml: React.FC<VexmlProps> = (props) => {
  return <div>vexml</div>;
};

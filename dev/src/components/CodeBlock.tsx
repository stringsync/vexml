import React from 'react';
import styled from 'styled-components';

const Block = styled.code`
  background-color: #eee;
  border: 1px solid #999;
  display: block;
  padding: 20px;
`;

export type CodeBlockProps = {
  children: React.ReactNode;
};

export const CodeBlock: React.FC<CodeBlockProps> = (props) => (
  <pre>
    <Block>{props.children}</Block>
  </pre>
);

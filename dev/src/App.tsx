import { Layout } from 'antd';
import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import styled from 'styled-components';
import './App.less';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Example } from './components/Example';
import { Examples } from './components/Examples';

const { Header, Content } = Layout;

const Wordmark = styled.h1`
  color: white;
  font-weight: lighter;
  font-family: monospace;
`;

const StyledContent = styled(Content)`
  background: white;
  padding: 24px;
`;

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Header>
          <Wordmark>vexml</Wordmark>
        </Header>
        <StyledContent>
          <Breadcrumbs />
          <Routes>
            <Route path="/">
              <Route index element={<Examples />} />
              <Route path=":exampleId" element={<Example />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </StyledContent>
      </Layout>
    </BrowserRouter>
  );
};

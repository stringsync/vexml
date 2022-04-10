import { Breadcrumb } from 'antd';
import { Route } from 'antd/lib/breadcrumb/Breadcrumb';
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const StyledBreadcrumb = styled(Breadcrumb)`
  margin: 16px 0;
`;

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const [routes, setRoutes] = useState(new Array<Route>());

  useEffect(() => {
    const nextRoutes = new Array<Route>();
    nextRoutes.push({ breadcrumbName: 'examples', path: '' });
    const parts = location.pathname.split('/').filter((part) => !!part);
    for (const part of parts) {
      if (part) {
        nextRoutes.push({ breadcrumbName: part, path: part });
      }
    }
    setRoutes(nextRoutes);
  }, [location]);

  return (
    <StyledBreadcrumb
      routes={routes}
      itemRender={(route, params, routes, paths) => {
        const last = routes.indexOf(route) === routes.length - 1;
        return last ? <span>{route.breadcrumbName}</span> : <Link to={paths.join('/')}>{route.breadcrumbName}</Link>;
      }}
    />
  );
};

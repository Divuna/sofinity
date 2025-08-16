import React from 'react';
import AuthGuard from '@/components/Layout/AuthGuard';
import { MainLayout } from '@/components/Layout/MainLayout';
import Dashboard from './Dashboard';

const Index = () => {
  return (
    <AuthGuard>
      <MainLayout>
        <Dashboard />
      </MainLayout>
    </AuthGuard>
  );
};

export default Index;

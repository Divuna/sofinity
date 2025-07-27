import React from 'react';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Header } from '@/components/Layout/Header';
import AuthGuard from '@/components/Layout/AuthGuard';
import Dashboard from './Dashboard';

const Index = () => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-surface flex">
        {/* Sidebar */}
        <Sidebar currentPath="/" />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <Dashboard />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;

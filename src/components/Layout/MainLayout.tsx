import React from 'react';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Header } from '@/components/Layout/Header';
import { BackButton } from '@/components/ui/back-button';
import { useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-surface flex">
      {/* Sidebar */}
      <Sidebar currentPath={location.pathname} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="mb-4">
            <BackButton />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
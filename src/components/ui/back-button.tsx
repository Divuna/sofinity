import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Check if there's browser history to go back to
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // No history, redirect to dashboard
      navigate('/');
    }
  };

  // Don't show back button on dashboard/home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <Button
      onClick={handleBack}
      variant="ghost"
      size="sm"
      className="group h-9 px-3 bg-gradient-primary hover:opacity-90 hover:shadow-medium text-white border-0 transition-all duration-300 hover:scale-105"
    >
      <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
      Zpět
    </Button>
  );
}
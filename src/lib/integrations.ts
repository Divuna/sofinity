import { supabase } from '@/integrations/supabase/client';

export interface OpravoStatus {
  isConnected: boolean;
  lastChecked: string;
  error?: string;
}

// Shared helper to get Opravo status via edge function
export const getOpravoStatus = async (projectId?: string): Promise<OpravoStatus> => {
  try {
    const { data, error } = await supabase.functions.invoke('sofinity-opravo-status', {
      body: projectId ? { projectId } : {}
    });

    if (error) {
      console.error('❌ [getOpravoStatus] Supabase function error:', error);
      return {
        isConnected: false,
        lastChecked: new Date().toISOString(),
        error: error.message || 'Chyba volání edge function'
      };
    }

    // Normalize response from edge function
    const p = data?.OpravoApiResult ?? data ?? {};
    
    const result: OpravoStatus = {
      isConnected: !!p.isConnected,
      lastChecked: p.lastChecked ?? new Date().toISOString(),
      error: p.error
    };

    console.log('✅ [getOpravoStatus] Normalized result:', result);
    return result;

  } catch (error) {
    console.error('❌ [getOpravoStatus] Unexpected error:', error);
    return {
      isConnected: false,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Neznámá chyba'
    };
  }
};

// Utility to check if project is Opravo
export const isOpravoProject = (projectName?: string): boolean => {
  return (projectName || '').trim().toLowerCase() === 'opravo';
};

// LocalStorage helpers for status persistence
const STORAGE_KEY = 'opravo-status';

export const saveOpravoStatusToStorage = (status: OpravoStatus): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } catch (error) {
    console.warn('Failed to save Opravo status to localStorage:', error);
  }
};

export const loadOpravoStatusFromStorage = (): OpravoStatus | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load Opravo status from localStorage:', error);
    return null;
  }
};
import { supabase } from '@/integrations/supabase/client';

export interface OpravoStatus {
  isConnected: boolean;
  lastChecked: string;
  error?: string;
  httpStatus?: number;
  latency?: number;
}

export interface OpravoStatusResponse {
  isConnected: boolean;
  lastChecked: string;
  error?: string;
  httpStatus?: number;
  latency?: number;
  metadata?: {
    retryAttempts?: number;
    nextRetryAt?: string;
    rateLimitRemaining?: number;
  };
}

// Enhanced status check with project context and error handling
export const getOpravoStatus = async (projectId?: string): Promise<OpravoStatus> => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 [getOpravoStatus] Starting status check', { projectId });
    
    const { data, error } = await supabase.functions.invoke('sofinity-opravo-status', {
      body: { 
        projectId,
        timestamp: new Date().toISOString(),
        clientId: 'opravo-status-ui'
      }
    });

    const latency = Date.now() - startTime;

    if (error) {
      console.error('❌ [getOpravoStatus] Supabase function error:', error);
      
      // Enhanced error handling with specific error types
      let errorMessage = 'Chyba volání edge function';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Časový limit edge function (30s)';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Překročen limit požadavků, zkuste za chvíli';
      } else if (error.message?.includes('unauthorized')) {
        errorMessage = 'Chyba autorizace - kontaktujte správce';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        isConnected: false,
        lastChecked: new Date().toISOString(),
        error: errorMessage,
        latency
      };
    }

    // Enhanced response normalization
    const rawResponse = data as OpravoStatusResponse;
    
    const result: OpravoStatus = {
      isConnected: !!rawResponse.isConnected,
      lastChecked: rawResponse.lastChecked || new Date().toISOString(),
      error: rawResponse.error,
      httpStatus: rawResponse.httpStatus,
      latency: rawResponse.latency || latency
    };

    console.log('✅ [getOpravoStatus] Status check completed', { 
      ...result, 
      totalLatency: latency,
      projectId 
    });
    
    return result;

  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('❌ [getOpravoStatus] Unexpected error:', error);
    
    // Categorize network errors for better UX
    let errorMessage = 'Neznámá chyba';
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch')) {
        errorMessage = 'Síťová chyba - zkontrolujte připojení';
      } else if (msg.includes('timeout')) {
        errorMessage = 'Časový limit požadavku';
      } else if (msg.includes('aborted')) {
        errorMessage = 'Požadavek byl přerušen';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      isConnected: false,
      lastChecked: new Date().toISOString(),
      error: errorMessage,
      latency
    };
  }
};

// Enhanced project detection with multiple criteria
export const isOpravoProject = (projectName?: string, projectId?: string): boolean => {
  if (!projectName && !projectId) return false;
  
  const nameMatch = (projectName || '').trim().toLowerCase() === 'opravo';
  const idMatch = projectId ? projectId.includes('opravo') : false;
  
  return nameMatch || idMatch;
};

// Enhanced localStorage with project-specific storage
const getStorageKey = (projectId?: string): string => {
  return projectId ? `opravo-status-${projectId}` : 'opravo-status-global';
};

export const saveOpravoStatusToStorage = (status: OpravoStatus, projectId?: string): void => {
  try {
    const key = getStorageKey(projectId);
    const storageData = {
      ...status,
      savedAt: new Date().toISOString(),
      projectId
    };
    localStorage.setItem(key, JSON.stringify(storageData));
    
    // Also save to global key for fallback
    localStorage.setItem('opravo-status-latest', JSON.stringify(storageData));
  } catch (error) {
    console.warn('[saveOpravoStatusToStorage] Failed to save to localStorage:', error);
  }
};

export const loadOpravoStatusFromStorage = (projectId?: string): OpravoStatus | null => {
  try {
    const key = getStorageKey(projectId);
    let stored = localStorage.getItem(key);
    
    // Fallback to global key if project-specific not found
    if (!stored) {
      stored = localStorage.getItem('opravo-status-latest');
    }
    
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Check if stored data is not too old (max 10 minutes)
    const savedAt = new Date(parsed.savedAt || 0);
    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    if (now.getTime() - savedAt.getTime() > maxAge) {
      console.log('[loadOpravoStatusFromStorage] Stored data too old, ignoring');
      return null;
    }
    
    return {
      isConnected: parsed.isConnected,
      lastChecked: parsed.lastChecked,
      error: parsed.error,
      httpStatus: parsed.httpStatus,
      latency: parsed.latency
    };
  } catch (error) {
    console.warn('[loadOpravoStatusFromStorage] Failed to load from localStorage:', error);
    return null;
  }
};

// Cleanup old storage entries
export const cleanupOpravoStorage = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const opravoKeys = keys.filter(key => key.startsWith('opravo-status-'));
    
    opravoKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const savedAt = new Date(parsed.savedAt || 0);
          const now = new Date();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (now.getTime() - savedAt.getTime() > maxAge) {
            localStorage.removeItem(key);
            console.log(`[cleanupOpravoStorage] Removed old entry: ${key}`);
          }
        }
      } catch (error) {
        // Remove invalid entries
        localStorage.removeItem(key);
        console.log(`[cleanupOpravoStorage] Removed invalid entry: ${key}`);
      }
    });
  } catch (error) {
    console.warn('[cleanupOpravoStorage] Failed to cleanup storage:', error);
  }
};
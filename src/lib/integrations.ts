import { supabase } from '@/integrations/supabase/client';

export interface SofinityStatus {
  isConnected: boolean;
  lastChecked: string;
  error?: string;
  httpStatus?: number;
  latency?: number;
}

export interface SofinityStatusResponse {
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
export const getSofinityStatus = async (projectId?: string): Promise<SofinityStatus> => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 [getSofinityStatus] Starting status check', { projectId });
    
    const { data, error } = await supabase.functions.invoke('sofinity-status', {
      body: { 
        project_id: projectId,
        timestamp: new Date().toISOString(),
        clientId: 'sofinity-status-ui'
      }
    });

    const latency = Date.now() - startTime;

    if (error) {
      console.error('❌ [getSofinityStatus] Supabase function error:', error);
      
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
    const rawResponse = data as SofinityStatusResponse;
    
    const result: SofinityStatus = {
      isConnected: !!rawResponse.isConnected,
      lastChecked: rawResponse.lastChecked || new Date().toISOString(),
      error: rawResponse.error,
      httpStatus: rawResponse.httpStatus,
      latency: rawResponse.latency || latency
    };

    console.log('✅ [getSofinityStatus] Status check completed', { 
      ...result, 
      totalLatency: latency,
      projectId 
    });
    
    return result;

  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('❌ [getSofinityStatus] Unexpected error:', error);
    
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
export const isSofinityProject = (projectName?: string, projectId?: string): boolean => {
  if (!projectName && !projectId) return false;
  
  // All projects are Sofinity projects now
  return true;
};

// Enhanced localStorage with project-specific storage
const getStorageKey = (projectId?: string): string => {
  return projectId ? `sofinity-status-${projectId}` : 'sofinity-status-global';
};

export const saveSofinityStatusToStorage = (status: SofinityStatus, projectId?: string): void => {
  try {
    const key = getStorageKey(projectId);
    const storageData = {
      ...status,
      savedAt: new Date().toISOString(),
      projectId
    };
    localStorage.setItem(key, JSON.stringify(storageData));
    
    // Also save to global key for fallback
    localStorage.setItem('sofinity-status-latest', JSON.stringify(storageData));
  } catch (error) {
    console.warn('[saveSofinityStatusToStorage] Failed to save to localStorage:', error);
  }
};

export const loadSofinityStatusFromStorage = (projectId?: string): SofinityStatus | null => {
  try {
    const key = getStorageKey(projectId);
    let stored = localStorage.getItem(key);
    
    // Fallback to global key if project-specific not found
    if (!stored) {
      stored = localStorage.getItem('sofinity-status-latest');
    }
    
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Check if stored data is not too old (max 10 minutes)
    const savedAt = new Date(parsed.savedAt || 0);
    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    if (now.getTime() - savedAt.getTime() > maxAge) {
      console.log('[loadSofinityStatusFromStorage] Stored data too old, ignoring');
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
    console.warn('[loadSofinityStatusFromStorage] Failed to load from localStorage:', error);
    return null;
  }
};

// Cleanup old storage entries
export const cleanupSofinityStorage = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const sofinityKeys = keys.filter(key => key.startsWith('sofinity-status-'));
    
    sofinityKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const savedAt = new Date(parsed.savedAt || 0);
          const now = new Date();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (now.getTime() - savedAt.getTime() > maxAge) {
            localStorage.removeItem(key);
            console.log(`[cleanupSofinityStorage] Removed old entry: ${key}`);
          }
        }
      } catch (error) {
        // Remove invalid entries
        localStorage.removeItem(key);
        console.log(`[cleanupSofinityStorage] Removed invalid entry: ${key}`);
      }
    });
  } catch (error) {
    console.warn('[cleanupSofinityStorage] Failed to cleanup storage:', error);
  }
};

// Legacy Opravo aliases for backward compatibility
export type OpravoStatus = SofinityStatus;
export type OpravoStatusResponse = SofinityStatusResponse;
export const getOpravoStatus = getSofinityStatus;
export const isOpravoProject = isSofinityProject;
export const saveOpravoStatusToStorage = saveSofinityStatusToStorage;
export const loadOpravoStatusFromStorage = loadSofinityStatusFromStorage;
export const cleanupOpravoStorage = cleanupSofinityStorage;

interface OpravoStatus {
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
}

const SOFINITY_BASE_URL = "https://api.sofinity.com";
const SOFINITY_API_KEY = "your-api-key"; // This should be configured in environment or settings

let opravoStatusCache: OpravoStatus | null = null;
let statusCheckTimeout: NodeJS.Timeout | null = null;

export const checkOpravoIntegration = async (): Promise<OpravoStatus> => {
  try {
    console.log('🔍 [Opravo Integration] Starting API check...', { 
      url: `${SOFINITY_BASE_URL}/opravo-status`,
      timestamp: new Date().toISOString()
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

    const response = await fetch(`${SOFINITY_BASE_URL}/opravo-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SOFINITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 [Opravo Integration] Raw API response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString()
    });

    const status: OpravoStatus = {
      isConnected: response.ok,
      lastChecked: new Date(),
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };

    opravoStatusCache = status;
    
    console.log('✅ [Opravo Integration] Final status object:', {
      ...status,
      lastChecked: status.lastChecked.toISOString()
    });

    return status;
  } catch (error) {
    console.error('❌ [Opravo Integration] Error during check:', error);

    const status: OpravoStatus = {
      isConnected: false,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Neznámá chyba',
    };

    opravoStatusCache = status;
    
    console.log('🔴 [Opravo Integration] Error status object:', {
      ...status,
      lastChecked: status.lastChecked.toISOString()
    });

    return status;
  }
};

export const getOpravoStatusFromCache = (): OpravoStatus | null => {
  return opravoStatusCache;
};

export const startOpravoStatusMonitoring = (onStatusUpdate: (status: OpravoStatus) => void) => {
  console.log('🚀 [Opravo Integration] Starting status monitoring...');
  
  // Clear any existing timeout to prevent duplicates
  if (statusCheckTimeout) {
    console.log('🔄 [Opravo Integration] Clearing existing monitoring interval');
    clearInterval(statusCheckTimeout);
  }

  // Start periodic checks every 60 seconds
  statusCheckTimeout = setInterval(async () => {
    console.log('⏰ [Opravo Integration] Periodic check triggered');
    const status = await checkOpravoIntegration();
    onStatusUpdate(status);
  }, 60000);

  // Initial check
  console.log('🎯 [Opravo Integration] Running initial check');
  checkOpravoIntegration().then(onStatusUpdate);
};

export const stopOpravoStatusMonitoring = () => {
  if (statusCheckTimeout) {
    console.log('🛑 [Opravo Integration] Stopping status monitoring');
    clearInterval(statusCheckTimeout);
    statusCheckTimeout = null;
  }
};
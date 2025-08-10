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

    const status: OpravoStatus = {
      isConnected: response.ok,
      lastChecked: new Date(),
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };

    opravoStatusCache = status;
    return status;
  } catch (error) {
    const status: OpravoStatus = {
      isConnected: false,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Neznámá chyba',
    };

    opravoStatusCache = status;
    return status;
  }
};

export const getOpravoStatusFromCache = (): OpravoStatus | null => {
  return opravoStatusCache;
};

export const startOpravoStatusMonitoring = (onStatusUpdate: (status: OpravoStatus) => void) => {
  // Clear any existing timeout
  if (statusCheckTimeout) {
    clearInterval(statusCheckTimeout);
  }

  // Start periodic checks every 60 seconds
  statusCheckTimeout = setInterval(async () => {
    const status = await checkOpravoIntegration();
    onStatusUpdate(status);
  }, 60000);

  // Initial check
  checkOpravoIntegration().then(onStatusUpdate);
};

export const stopOpravoStatusMonitoring = () => {
  if (statusCheckTimeout) {
    clearInterval(statusCheckTimeout);
    statusCheckTimeout = null;
  }
};
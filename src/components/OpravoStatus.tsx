import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { getOpravoStatus, saveOpravoStatusToStorage, loadOpravoStatusFromStorage, type OpravoStatus } from '@/lib/integrations';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale/cs';

interface OpravoStatusProps {
  projectId?: string;
  className?: string;
  compact?: boolean;
}

export default function OpravoStatus({ projectId, className = '', compact = false }: OpravoStatusProps) {
  const [status, setStatus] = useState<OpravoStatus>(() => 
    loadOpravoStatusFromStorage(projectId) || {
      isConnected: false,
      lastChecked: new Date().toISOString(),
      error: 'Načítání...'
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const { toast } = useToast();

  const performStatusCheck = useCallback(async (showToast = false) => {
    setIsLoading(true);
    
    try {
      const result = await getOpravoStatus(projectId);
      setStatus(result);
      saveOpravoStatusToStorage(result, projectId);
      setRetryAttempts(0); // Reset retry attempts on success
      
      if (showToast) {
        toast({
          title: result.isConnected ? "Připojeno" : "Odpojeno",
          description: result.isConnected 
            ? "Opravo API je dostupné" 
            : `Problém: ${result.error || 'Neznámá chyba'}`,
          variant: result.isConnected ? "default" : "destructive"
        });
      }
    } catch (error) {
      const errorStatus: OpravoStatus = {
        isConnected: false,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Neznámá chyba'
      };
      
      setStatus(errorStatus);
      saveOpravoStatusToStorage(errorStatus, projectId);
      setRetryAttempts(prev => prev + 1);
      
      if (showToast) {
        toast({
          title: "Chyba",
          description: errorStatus.error,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  const startPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Implement exponential backoff for errors
    const baseInterval = 60000; // 60 seconds
    const backoffMultiplier = Math.min(Math.pow(2, retryAttempts), 8); // Max 8 minutes
    const intervalMs = status.isConnected ? baseInterval : baseInterval * backoffMultiplier;
    
    const interval = setInterval(() => {
      performStatusCheck(false);
    }, intervalMs);
    
    setPollingInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [performStatusCheck, retryAttempts, status.isConnected]);

  useEffect(() => {
    // Initial status check
    performStatusCheck(false);
    
    // Start polling
    const cleanup = startPolling();
    
    return cleanup;
  }, []);

  // Restart polling when retry attempts change
  useEffect(() => {
    const cleanup = startPolling();
    return cleanup;
  }, [startPolling]);

  const handleManualRefresh = () => {
    performStatusCheck(true);
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="w-3 h-3 animate-spin" />;
    }
    return status.isConnected 
      ? <Wifi className="w-3 h-3" />
      : <WifiOff className="w-3 h-3" />;
  };

  const getStatusVariant = (): "default" | "destructive" | "secondary" => {
    if (isLoading) return "secondary";
    return status.isConnected ? "default" : "destructive";
  };

  const getTooltipContent = () => {
    const lastCheckedDate = new Date(status.lastChecked);
    const relativeTime = formatDistanceToNow(lastCheckedDate, { 
      addSuffix: true, 
      locale: cs 
    });
    
    return (
      <div className="space-y-1">
        <div>Poslední kontrola: {relativeTime}</div>
        <div className="text-xs opacity-80">
          {lastCheckedDate.toLocaleString('cs-CZ')}
        </div>
        {status.error && (
          <div className="text-xs text-red-200 mt-1">
            Chyba: {status.error}
          </div>
        )}
        {retryAttempts > 0 && (
          <div className="text-xs opacity-80">
            Pokusů o opakování: {retryAttempts}
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={getStatusVariant()} 
              className={`flex items-center gap-1 cursor-help ${className}`}
            >
              {getStatusIcon()}
              {isLoading ? 'Kontrola...' : (status.isConnected ? 'Připojeno' : 'Odpojeno')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={getStatusVariant()} 
              className="flex items-center gap-1 cursor-help"
            >
              {getStatusIcon()}
              {isLoading ? 'Kontrola...' : (status.isConnected ? 'Opravo Připojeno' : 'Opravo Odpojeno')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleManualRefresh}
        disabled={isLoading}
        className="h-6 px-2 text-xs"
      >
        <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
        Znovu ověřit
      </Button>
      
      {!status.isConnected && status.error && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="w-4 h-4 text-destructive cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                {status.error}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
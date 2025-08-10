import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface OpravoStatusResponse {
  isConnected: boolean;
  lastChecked: string;
  error?: string;
}

interface OpravoStatusBadgeProps {
  projectId?: string;
  showRefreshButton?: boolean;
  compact?: boolean;
  className?: string;
}

export function OpravoStatusBadge({ 
  projectId, 
  showRefreshButton = false, 
  compact = false,
  className = ""
}: OpravoStatusBadgeProps) {
  const [status, setStatus] = useState<OpravoStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const { toast } = useToast();

  const checkStatus = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else if (loading === false) {
        // For background polling, don't show loading state
      }

      console.log('🔍 [OpravoStatusBadge] Checking Opravo status...');
      
      const { data, error } = await supabase.functions.invoke('sofinity-opravo-status', {
        body: projectId ? { projectId } : {}
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ [OpravoStatusBadge] Status received:', data);
      
      const statusData: OpravoStatusResponse = {
        isConnected: data.isConnected || false,
        lastChecked: data.lastChecked || new Date().toISOString(),
        error: data.error
      };

      setStatus(statusData);
      setLastError(data.error || null);
      setRetryAttempts(0);

      if (isManualRefresh) {
        toast({
          title: statusData.isConnected ? "Připojení ověřeno" : "Připojení nedostupné",
          description: `Stav aktualizován v ${new Date(statusData.lastChecked).toLocaleTimeString('cs-CZ')}`,
          variant: statusData.isConnected ? "default" : "destructive"
        });
      }

    } catch (error) {
      console.error('❌ [OpravoStatusBadge] Error checking status:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba';
      setLastError(errorMessage);
      
      // Exponential backoff: 1s -> 2s -> 4s, max 3 attempts
      if (retryAttempts < 3) {
        const delay = Math.pow(2, retryAttempts) * 1000;
        console.log(`🔄 [OpravoStatusBadge] Retrying in ${delay}ms (attempt ${retryAttempts + 1})`);
        
        setTimeout(() => {
          setRetryAttempts(prev => prev + 1);
          checkStatus(false);
        }, delay);
      } else {
        console.log('❌ [OpravoStatusBadge] Max retry attempts reached');
        
        if (isManualRefresh) {
          toast({
            title: "Chyba při ověřování",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, loading, retryAttempts, toast]);

  // Initial load and polling setup
  useEffect(() => {
    checkStatus(false);

    // Start polling every 60 seconds
    const interval = setInterval(() => {
      checkStatus(false);
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [checkStatus]);

  const handleManualRefresh = () => {
    setRetryAttempts(0);
    checkStatus(true);
  };

  const formatLastChecked = (lastChecked: string) => {
    const date = new Date(lastChecked);
    return date.toLocaleString('cs-CZ', {
      timeZone: 'CET',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getErrorPreview = (error: string) => {
    // Truncate long error messages for compact display
    if (error.length > 50) {
      return error.substring(0, 50) + '...';
    }
    return error;
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-5 w-20" />
        {showRefreshButton && <Skeleton className="h-8 w-8 rounded" />}
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Neznámý stav
        </Badge>
        {showRefreshButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  const tooltipContent = (
    <div className="space-y-1">
      <div>
        <strong>Stav:</strong> {status.isConnected ? 'Připojeno' : 'Odpojeno'}
      </div>
      <div>
        <strong>Poslední kontrola:</strong> {formatLastChecked(status.lastChecked)}
      </div>
      {status.error && (
        <div className="text-destructive">
          <strong>Chyba:</strong> {status.error}
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={status.isConnected ? 'default' : 'destructive'}
              className="text-xs flex items-center gap-1 cursor-help"
            >
              {status.isConnected ? (
                <><Wifi className="w-3 h-3" /> Připojeno</>
              ) : (
                <><WifiOff className="w-3 h-3" /> Odpojeno</>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showRefreshButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="h-8 w-8 p-0"
          title="Znovu ověřit"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}

      {/* Error display for repeated failures */}
      {!compact && lastError && retryAttempts >= 3 && (
        <div className="text-xs text-destructive max-w-xs truncate">
          {getErrorPreview(lastError)}
        </div>
      )}
    </div>
  );
}
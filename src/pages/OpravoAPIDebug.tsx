import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bug, CheckCircle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { getOpravoStatus, type OpravoStatus } from '@/lib/integrations';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_URL = "https://rrmvxsldrjgbdxluklka.supabase.co";

interface APIResponse {
  status: 'loading' | 'success' | 'error';
  opravoStatus?: OpravoStatus;
  error?: string;
  timestamp: Date;
  duration?: number;
}

export default function OpravoAPIDebug() {
  const [response, setResponse] = useState<APIResponse>({
    status: 'loading',
    timestamp: new Date()
  });
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const performAPICall = async () => {
    console.log('🚀 [OpravoAPIDebug] Starting API call...');
    const startTime = Date.now();
    
    setResponse(prev => ({
      ...prev,
      status: 'loading',
      timestamp: new Date()
    }));

    try {
      const opravoStatus = await getOpravoStatus();
      const duration = Date.now() - startTime;

      setResponse({
        status: 'success',
        opravoStatus,
        timestamp: new Date(),
        duration
      });

      toast({
        title: opravoStatus.isConnected ? "Připojeno" : "Odpojeno",
        description: opravoStatus.isConnected 
          ? "Opravo API je dostupné" 
          : `Chyba: ${opravoStatus.error || 'Neznámá chyba'}`,
        variant: opravoStatus.isConnected ? "default" : "destructive"
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [OpravoAPIDebug] Error during API call:', error);
      
      setResponse({
        status: 'error',
        error: error instanceof Error ? error.message : 'Neznámá chyba',
        timestamp: new Date(),
        duration
      });

      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : 'Neznámá chyba',
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Initial call
    performAPICall();

    // Start 60s polling
    const interval = setInterval(performAPICall, 60000);
    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const getStatusIcon = () => {
    switch (response.status) {
      case 'loading':
        return <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />;
      case 'success':
        return response.opravoStatus?.isConnected 
          ? <CheckCircle className="w-5 h-5 text-green-500" />
          : <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (response.status) {
      case 'loading':
        return <Badge variant="secondary">Načítání...</Badge>;
      case 'success':
        return response.opravoStatus?.isConnected
          ? <Badge variant="default" className="flex items-center gap-1">
              <Wifi className="w-3 h-3" /> Připojeno
            </Badge>
          : <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Odpojeno
            </Badge>;
      case 'error':
        return <Badge variant="destructive">Chyba</Badge>;
    }
  };

  const formatLastChecked = (dateString?: string) => {
    if (!dateString) return 'Neznámé';
    try {
      return new Date(dateString).toLocaleString('cs-CZ');
    } catch {
      return 'Neplatné datum';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Opravo API Debug</h1>
            <p className="text-muted-foreground mt-1">
              Dočasný nástroj pro testování Opravo API endpointu
            </p>
          </div>
        </div>
        <Button 
          onClick={performAPICall}
          disabled={response.status === 'loading'}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${response.status === 'loading' ? 'animate-spin' : ''}`} />
          Znovu ověřit
        </Button>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Konfigurace API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Edge Function URL</label>
              <code className="block p-2 bg-muted rounded text-sm font-mono">
                {SUPABASE_URL}/functions/v1/sofinity-opravo-status
              </code>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">API Key</label>
              <code className="block p-2 bg-muted rounded text-sm font-mono">
                Bezpečně uložen v Supabase Secrets
              </code>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Request Headers</label>
            <pre className="p-2 bg-muted rounded text-sm font-mono mt-1">
{JSON.stringify({
  'Content-Type': 'application/json'
}, null, 2)}
            </pre>
            <p className="text-xs text-muted-foreground mt-1">
              * Authorization header se přidává automaticky v edge function pomocí SOFINITY_API_KEY
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Response Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {getStatusIcon()}
            Stav odpovědi
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Čas požadavku</label>
              <div className="text-sm font-mono">
                {response.timestamp.toLocaleString('cs-CZ')}
              </div>
            </div>
            {response.duration && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Doba odezvy</label>
                <div className="text-sm font-mono">
                  {response.duration}ms
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Stav</label>
              <div className="text-sm">
                {response.status === 'loading' && 'Načítání...'}
                {response.status === 'success' && (response.opravoStatus?.isConnected ? 'Připojeno' : 'Odpojeno')}
                {response.status === 'error' && 'Chyba požadavku'}
              </div>
            </div>
          </div>
          
          {response.opravoStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Poslední kontrola</label>
                <div className="text-sm font-mono">
                  {formatLastChecked(response.opravoStatus.lastChecked)}
                </div>
              </div>
              {response.opravoStatus.error && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Chyba</label>
                  <div className="text-sm text-destructive break-words">
                    {response.opravoStatus.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Details - Always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detaily odpovědi</CardTitle>
        </CardHeader>
        <CardContent>
          {response.status === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Probíhá požadavek...</span>
            </div>
          )}
          
          {(response.status === 'error' || (response.status === 'success' && !response.opravoStatus?.isConnected)) && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  {response.status === 'error' ? 'Chyba volání' : 'Opravo API nedostupné'}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {response.error || response.opravoStatus?.error || 'Neznámá chyba'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Kompletní odpověď</label>
                <pre className="p-4 bg-muted rounded-lg text-sm font-mono mt-2 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(response.opravoStatus || { error: response.error }, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {response.status === 'success' && response.opravoStatus?.isConnected && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Úspěšná odpověď</label>
              <pre className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-sm font-mono mt-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(response.opravoStatus, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Polling Info */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-200">Automatické ověřování</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Status se automaticky ověřuje každých 60 sekund. Můžete také použít tlačítko "Znovu ověřit" pro okamžitou kontrolu.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Notice */}
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Bug className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-800 dark:text-orange-200">Vývojářské upozornění</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Tato stránka je určena pouze pro vývoj a debugging. 
                Nebude zahrnuta v produkční verzi aplikace.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

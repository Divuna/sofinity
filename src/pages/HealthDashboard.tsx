import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  Database, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  RefreshCw,
  TrendingUp,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditResult {
  table: string;
  total: number;
  missing: number;
  backfilled: number;
  errors: string[];
}

interface AuditHistoryRecord {
  id: string;
  run_at: string;
  summary_text: string;
  valid_ratio: number;
  total_tables: number;
  details: any;
}

interface SystemStatus {
  eventLogs: { total: number; errors: number };
  aiRequests: { total: number; waiting: number; completed: number; error: number };
}

export default function HealthDashboard() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [auditHistory, setAuditHistory] = useState<AuditHistoryRecord[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [lastAudit, setLastAudit] = useState<AuditHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditHistory();
    fetchSystemStatus();
  }, []);

  const fetchAuditHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('AuditHistory')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setAuditHistory(data || []);
      if (data && data.length > 0) {
        setLastAudit(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching audit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      // Get EventLogs stats
      const { count: eventLogsTotal } = await supabase
        .from('EventLogs')
        .select('*', { count: 'exact', head: true });

      const { count: eventLogsErrors } = await supabase
        .from('EventLogs')
        .select('*', { count: 'exact', head: true })
        .ilike('event_name', '%error%');

      // Get AIRequests stats
      const { count: aiTotal } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true });

      const { count: aiWaiting } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      const { count: aiCompleted } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: aiError } = await supabase
        .from('AIRequests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error');

      setSystemStatus({
        eventLogs: { total: eventLogsTotal || 0, errors: eventLogsErrors || 0 },
        aiRequests: { 
          total: aiTotal || 0, 
          waiting: aiWaiting || 0, 
          completed: aiCompleted || 0,
          error: aiError || 0
        }
      });
    } catch (error: any) {
      console.error('Error fetching system status:', error);
    }
  };

  const runAudit = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('data-integrity-audit');

      if (error) throw error;

      toast({
        title: 'Audit dokončen',
        description: data.summary || 'Data integrity audit byl úspěšně dokončen.',
      });

      // Refresh data
      await fetchAuditHistory();
      await fetchSystemStatus();
    } catch (error: any) {
      console.error('Error running audit:', error);
      toast({
        title: 'Chyba při spuštění auditu',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getHealthScore = () => {
    if (!lastAudit) return null;
    const ratio = lastAudit.valid_ratio;
    if (ratio >= 95) return { label: 'Vynikající', color: 'text-success', icon: CheckCircle2 };
    if (ratio >= 80) return { label: 'Dobrý', color: 'text-warning', icon: AlertTriangle };
    return { label: 'Vyžaduje pozornost', color: 'text-destructive', icon: XCircle };
  };

  const healthScore = getHealthScore();
  const errorRate = systemStatus 
    ? ((systemStatus.eventLogs.errors / systemStatus.eventLogs.total) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sofinity Health Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Data Integrity & System Health Monitoring
          </p>
        </div>
        <Button 
          onClick={runAudit} 
          disabled={isRunning}
          size="lg"
          className="gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Běží audit...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Spustit Audit
            </>
          )}
        </Button>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Data Integrity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastAudit ? (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {lastAudit.valid_ratio.toFixed(1)}%
                </div>
                {healthScore && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${healthScore.color}`}>
                    <healthScore.icon className="h-3 w-3" />
                    {healthScore.label}
                  </p>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Žádná data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {systemStatus ? (
              <>
                <div className="text-2xl font-bold text-foreground">{errorRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {systemStatus.eventLogs.errors} / {systemStatus.eventLogs.total} events
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Načítání...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              AI Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {systemStatus ? (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {systemStatus.aiRequests.total}
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {systemStatus.aiRequests.completed} OK
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {systemStatus.aiRequests.waiting} čeká
                  </Badge>
                  {systemStatus.aiRequests.error > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {systemStatus.aiRequests.error} chyb
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Načítání...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Poslední Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastAudit ? (
              <>
                <div className="text-sm font-medium text-foreground">
                  {format(new Date(lastAudit.run_at), 'dd.MM.yyyy')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(lastAudit.run_at), 'HH:mm:ss')}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Žádný audit</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Audit Details */}
      {lastAudit && (
        <Card>
          <CardHeader>
            <CardTitle>Poslední Audit - Detaily</CardTitle>
            <CardDescription>
              {format(new Date(lastAudit.run_at), 'dd.MM.yyyy HH:mm:ss')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{lastAudit.summary_text}</AlertDescription>
            </Alert>

            <div className="space-y-3">
              {lastAudit.details.results.map((result, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground">{result.table}</h4>
                    <Badge variant={result.errors.length > 0 ? 'destructive' : 'outline'}>
                      {result.total} záznamů
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Chybějící:</span>
                      <span className="ml-2 font-medium text-foreground">{result.missing}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Opraveno:</span>
                      <span className="ml-2 font-medium text-success">{result.backfilled}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Chyby:</span>
                      <span className="ml-2 font-medium text-destructive">{result.errors.length}</span>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-2 text-xs text-destructive">
                      {result.errors.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle>Historie Auditů</CardTitle>
          <CardDescription>Posledních 10 spuštění integrity auditu</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : auditHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Žádná historie auditů. Spusťte první audit pomocí tlačítka výše.
            </div>
          ) : (
            <div className="space-y-2">
              {auditHistory.map((audit, idx) => (
                <div key={audit.id}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {format(new Date(audit.run_at), 'dd.MM.yyyy HH:mm:ss')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {audit.summary_text}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={audit.valid_ratio >= 95 ? 'default' : 'secondary'}>
                        {audit.valid_ratio.toFixed(1)}% OK
                      </Badge>
                      <Badge variant="outline">{audit.total_tables} tabulek</Badge>
                    </div>
                  </div>
                  {idx < auditHistory.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

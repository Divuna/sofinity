import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Play, Pause, RefreshCw, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

interface AutomationStatus {
  isRunning: boolean;
  lastRun?: string;
  nextRun?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
}

interface AutomationReport {
  automationId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  totalCampaigns: number;
  processedEmails: number;
  totalMediaGenerated: number;
  errors: string[];
}

interface MonitoringReport {
  timestamp: string;
  newCampaigns: number;
  newCustomers: number;
  triggeredWorkflows: number;
  pendingAIRequests: number;
  draftEmails: number;
  emailsWithoutMedia: number;
  actions: string[];
  errors: string[];
}

export function AutomationStatus() {
  const { toast } = useToast();
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({
    isRunning: false,
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0
  });
  const [lastReport, setLastReport] = useState<AutomationReport | null>(null);
  const [monitoringReport, setMonitoringReport] = useState<MonitoringReport | null>(null);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  useEffect(() => {
    loadAutomationStatus();
    const interval = setInterval(loadAutomationStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAutomationStatus = async () => {
    try {
      // Get recent automation logs
      const { data: auditLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .in('event_name', ['automated_workflow_completed', 'automated_monitoring_completed'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (auditLogs && auditLogs.length > 0) {
        const workflowLogs = auditLogs.filter(log => log.event_name === 'automated_workflow_completed');
        const monitoringLogs = auditLogs.filter(log => log.event_name === 'automated_monitoring_completed');
        
        if (workflowLogs.length > 0) {
          const latestWorkflow = workflowLogs[0];
          const eventData = latestWorkflow.event_data as any;
          setAutomationStatus({
            isRunning: false,
            lastRun: latestWorkflow.created_at,
            totalRuns: workflowLogs.length,
            successfulRuns: workflowLogs.filter(log => {
              const data = log.event_data as any;
              return !data?.errors_count || data.errors_count === 0;
            }).length,
            failedRuns: workflowLogs.filter(log => {
              const data = log.event_data as any;
              return data?.errors_count > 0;
            }).length
          });
        }

        if (monitoringLogs.length > 0) {
          const latestMonitoring = monitoringLogs[0];
          const eventData = latestMonitoring.event_data as any;
          setMonitoringReport(eventData?.monitoring_report || null);
        }
      }
    } catch (error: any) {
      console.error('Error loading automation status:', error);
    }
  };

  const runAutomatedWorkflow = async () => {
    setAutomationLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('automated-workflow', {
        body: { trigger: 'manual' }
      });

      if (error) throw error;

      setLastReport(data.report);
      
      toast({
        title: "✅ Automatizovaný workflow spuštěn",
        description: `Zpracováno: ${data.report.processedEmails} e-mailů, ${data.report.totalMediaGenerated} médií`,
      });

      await loadAutomationStatus();
    } catch (error: any) {
      toast({
        title: "❌ Chyba při spuštění automatizace",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAutomationLoading(false);
    }
  };

  const runMonitoring = async () => {
    setMonitoringLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('automated-monitoring', {
        body: { trigger: 'manual' }
      });

      if (error) throw error;

      setMonitoringReport(data.report);
      
      toast({
        title: "✅ Monitoring dokončen",
        description: `Nalezeno: ${data.report.newCampaigns} kampaní, ${data.report.newCustomers} zákazníků`,
      });

      await loadAutomationStatus();
    } catch (error: any) {
      toast({
        title: "❌ Chyba při monitoringu",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMonitoringLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Dokončeno</Badge>;
      case 'running':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Běží</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Chyba</Badge>;
      default:
        return <Badge variant="outline">Neznámý</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Automation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Automatizovaný OneMil Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{automationStatus.totalRuns}</div>
              <div className="text-sm text-muted-foreground">Celkových spuštění</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{automationStatus.successfulRuns}</div>
              <div className="text-sm text-muted-foreground">Úspěšných</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{automationStatus.failedRuns}</div>
              <div className="text-sm text-muted-foreground">S chybami</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {automationStatus.lastRun ? new Date(automationStatus.lastRun).toLocaleTimeString('cs-CZ') : 'Nikdy'}
              </div>
              <div className="text-sm text-muted-foreground">Poslední spuštění</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runAutomatedWorkflow} 
              disabled={automationLoading}
              className="flex items-center gap-2"
            >
              {automationLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Spustit Automatizaci
            </Button>
            <Button 
              onClick={runMonitoring} 
              disabled={monitoringLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {monitoringLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Spustit Monitoring
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest Automation Report */}
      {lastReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Poslední Automatizace</span>
              {getStatusBadge(lastReport.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold">{lastReport.totalCampaigns}</div>
                <div className="text-sm text-muted-foreground">Kampaní</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{lastReport.processedEmails}</div>
                <div className="text-sm text-muted-foreground">E-mailů</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{lastReport.totalMediaGenerated}</div>
                <div className="text-sm text-muted-foreground">Médií</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{lastReport.errors.length}</div>
                <div className="text-sm text-muted-foreground">Chyb</div>
              </div>
            </div>
            
            {lastReport.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-red-600 mb-2">Chyby:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {lastReport.errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monitoring Report */}
      {monitoringReport && (
        <Card>
          <CardHeader>
            <CardTitle>Monitoring Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{monitoringReport.newCampaigns}</div>
                <div className="text-sm text-muted-foreground">Nové kampaně</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{monitoringReport.newCustomers}</div>
                <div className="text-sm text-muted-foreground">Noví zákazníci</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">{monitoringReport.pendingAIRequests}</div>
                <div className="text-sm text-muted-foreground">AI požadavky</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">{monitoringReport.emailsWithoutMedia}</div>
                <div className="text-sm text-muted-foreground">E-maily bez médií</div>
              </div>
            </div>

            {monitoringReport.actions.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Provedené akce:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {monitoringReport.actions.map((action, index) => (
                    <li key={index} className="text-green-600">{action}</li>
                  ))}
                </ul>
              </div>
            )}

            {monitoringReport.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-red-600 mb-2">Chyby monitoringu:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {monitoringReport.errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
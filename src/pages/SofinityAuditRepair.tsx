import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database,
  Wrench,
  Activity,
  FileText,
  Download,
  Clock,
  Users,
  Shield
} from 'lucide-react';

interface EventResult {
  id: string;
  event_name: string;
  user_id: string;
  timestamp: string;
  metadata: any;
  generation_type: 'existing' | 'repaired';
}

interface AuditStats {
  total_repairs: number;
  total_validations: number;
  runtime_ms: number;
  last_check: string;
  health_score?: number;
}

export default function SofinityAuditRepair() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isRepairingEvents, setIsRepairingEvents] = useState(false);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const [eventResults, setEventResults] = useState<EventResult[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats>({
    total_repairs: 0,
    total_validations: 0,
    runtime_ms: 0,
    last_check: '',
    health_score: 0
  });
  const [fullAuditReport, setFullAuditReport] = useState<any>(null);

  const testConnection = async () => {
    setIsTestingConnection(true);
    const startTime = Date.now();
    
    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('test-connection');
      
      if (error) {
        toast({
          title: "❌ Connection Test Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      const eventCount = data?.event_count || 0;
      const runtime = Date.now() - startTime;
      
      setAuditStats(prev => ({
        ...prev,
        runtime_ms: runtime,
        last_check: new Date().toISOString()
      }));

      toast({
        title: "✅ Connection Test Successful", 
        description: `Found ${eventCount} events from the last 24 hours. Runtime: ${runtime}ms`,
        variant: "default"
      });

    } catch (error: any) {
      toast({
        title: "❌ Connection Test Failed",
        description: `Connection failed: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const repairMissingEvents = async () => {
    setIsRepairingEvents(true);
    const startTime = Date.now();
    
    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('repair-missing-events');
      
      if (error) {
        toast({
          title: "❌ Repair Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      const runtime = Date.now() - startTime;
      const repairedEvents = data?.generated_events || [];
      
      // Transform the results for the table
      const transformedEvents: EventResult[] = repairedEvents.map((event: any) => ({
        id: event.id || crypto.randomUUID(),
        event_name: event.event_name,
        user_id: event.user_id,
        timestamp: event.timestamp || new Date().toISOString(),
        metadata: event.metadata,
        generation_type: 'repaired' as const
      }));

      setEventResults(prev => [
        ...transformedEvents,
        ...prev
      ]);

      setAuditStats(prev => ({
        ...prev,
        total_repairs: prev.total_repairs + repairedEvents.length,
        runtime_ms: runtime,
        last_check: new Date().toISOString()
      }));

      toast({
        title: "✅ Events Repaired Successfully", 
        description: `Generated ${repairedEvents.length} missing events. Runtime: ${runtime}ms`,
        variant: "default"
      });

    } catch (error: any) {
      toast({
        title: "❌ Repair Failed",
        description: `Failed to repair events: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsRepairingEvents(false);
    }
  };

  const runAudit = async () => {
    setIsRunningAudit(true);
    const startTime = Date.now();
    
    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('run-audit');
      
      if (error) {
        toast({
          title: "❌ Audit Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      const runtime = Date.now() - startTime;
      const validatedEvents = data?.validated_events || [];
      const validationCount = data?.validation_count || 0;
      
      // Add existing events to results table
      const transformedEvents: EventResult[] = validatedEvents.map((event: any) => ({
        id: event.id || crypto.randomUUID(),
        event_name: event.event_name,
        user_id: event.user_id,
        timestamp: event.timestamp,
        metadata: event.metadata,
        generation_type: 'existing' as const
      }));

      setEventResults(transformedEvents);

      setAuditStats(prev => ({
        ...prev,
        total_validations: prev.total_validations + validationCount,
        runtime_ms: runtime,
        last_check: new Date().toISOString()
      }));

      toast({
        title: "✅ Audit Complete", 
        description: `Validated ${validationCount} events. Runtime: ${runtime}ms`,
        variant: "default"
      });

    } catch (error: any) {
      toast({
        title: "❌ Audit Failed",
        description: `Audit failed: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsRunningAudit(false);
    }
  };

  const generateFullAuditReport = async () => {
    setIsGeneratingReport(true);
    const startTime = Date.now();
    
    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('generate-audit-report');
      
      if (error) {
        toast({
          title: "❌ Report Generation Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      const runtime = Date.now() - startTime;
      const healthScore = data?.health_score || 0;
      
      setFullAuditReport(data);
      setAuditStats(prev => ({
        ...prev,
        runtime_ms: runtime,
        last_check: new Date().toISOString(),
        health_score: healthScore
      }));

      toast({
        title: "✅ Full Audit Report Generated", 
        description: `Health Score: ${healthScore}%. Runtime: ${runtime}ms`,
        variant: "default"
      });

    } catch (error: any) {
      toast({
        title: "❌ Report Generation Failed",
        description: `Failed to generate report: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadAuditReport = () => {
    if (!fullAuditReport) {
      toast({
        title: "❌ No Report Available",
        description: "Please generate a full audit report first.",
        variant: "destructive"
      });
      return;
    }

    const reportJson = JSON.stringify(fullAuditReport, null, 2);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sofinity-audit-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "✅ Report Downloaded",
      description: "Audit report downloaded successfully.",
      variant: "default"
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('cs-CZ');
  };

  const truncateUserId = (userId: string) => {
    return userId.length > 8 ? `${userId.substring(0, 8)}...` : userId;
  };

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sofinity Audit & Repair</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive audit and repair system for Sofinity event logs and integrations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <Badge variant="outline">Admin Only</Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Control Panel
            </CardTitle>
            <CardDescription>
              Execute audit and repair operations on Sofinity event logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button 
                onClick={testConnection} 
                disabled={isTestingConnection || isRepairingEvents || isRunningAudit || isGeneratingReport}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Database className="w-4 h-4" />
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
              
              <Button 
                onClick={repairMissingEvents} 
                disabled={isTestingConnection || isRepairingEvents || isRunningAudit || isGeneratingReport}
                className="gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <Wrench className="w-4 h-4" />
                {isRepairingEvents ? 'Repairing...' : 'Repair Missing Events'}
              </Button>
              
              <Button 
                onClick={runAudit} 
                disabled={isTestingConnection || isRepairingEvents || isRunningAudit || isGeneratingReport}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                {isRunningAudit ? 'Auditing...' : 'Run Audit'}
              </Button>
              
              <Button 
                onClick={generateFullAuditReport} 
                disabled={isTestingConnection || isRepairingEvents || isRunningAudit || isGeneratingReport}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <FileText className="w-4 h-4" />
                {isGeneratingReport ? 'Generating...' : 'Generate Full Audit Report'}
              </Button>
            </div>
            
            {fullAuditReport && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button 
                  onClick={downloadAuditReport}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download JSON Report
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Event Results
            </CardTitle>
            <CardDescription>
              Events processed by audit and repair operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventResults.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No events processed yet. Use the control panel above to run operations.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Metadata</TableHead>
                      <TableHead>Generation Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventResults.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-xs">
                          {truncateUserId(event.id)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {event.event_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateUserId(event.user_id)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </TableCell>
                        <TableCell>
                          <pre className="text-xs bg-muted p-2 rounded max-w-xs overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={event.generation_type === 'repaired' ? 'destructive' : 'default'}
                          >
                            {event.generation_type === 'repaired' ? 'Repaired' : 'Existing'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Footer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {auditStats.total_repairs}
                </div>
                <div className="text-sm text-muted-foreground">Total Repairs</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {auditStats.total_validations}
                </div>
                <div className="text-sm text-muted-foreground">Total Validations</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {auditStats.runtime_ms}ms
                </div>
                <div className="text-sm text-muted-foreground">Runtime</div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Last Check</div>
                <div className="text-sm font-medium">
                  {auditStats.last_check ? (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(auditStats.last_check)}
                    </div>
                  ) : (
                    'Not executed'
                  )}
                </div>
              </div>
              
              {auditStats.health_score !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {auditStats.health_score}%
                  </div>
                  <div className="text-sm text-muted-foreground">Health Score</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
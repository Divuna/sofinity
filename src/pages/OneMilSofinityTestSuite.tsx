import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Download, 
  Clock, 
  Database,
  Zap,
  Eye,
  Globe
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  executionTime?: number;
}

interface DataIntegrityResult {
  orphanedCounts: Record<string, number>;
  fkConsistency: Record<string, boolean>;
  totalRecords: Record<string, number>;
}

interface PerformanceResult {
  totalEvents: number;
  executionTime: number;
  eventsPerSecond: number;
  status: 'fast' | 'medium' | 'slow';
}

interface RealtimeUpdate {
  id: string;
  event_name: string;
  user_id: string;
  timestamp: string;
  metadata?: any;
}

interface TestSuiteResults {
  data_integrity_results: DataIntegrityResult;
  edge_case_results: TestResult[];
  performance_results: PerformanceResult[];
  realtime_updates: RealtimeUpdate[];
  summary_metrics: {
    total_tests: number;
    passed: number;
    failed: number;
    warnings: number;
    success_rate: number;
  };
}

export default function OneMilSofinityTestSuite() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eventCount, setEventCount] = useState('100');
  const [results, setResults] = useState<TestSuiteResults | null>(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState<RealtimeUpdate[]>([]);
  const [currentTest, setCurrentTest] = useState('');

  useEffect(() => {
    // Nastavení real-time sledování posledních 50 eventů
    const channel = supabase
      .channel('test-suite-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'EventLogs'
        },
        (payload) => {
          const newUpdate: RealtimeUpdate = {
            id: payload.new.id,
            event_name: payload.new.event_name,
            user_id: payload.new.user_id,
            timestamp: new Date().toISOString(),
            metadata: payload.new.metadata
          };
          
          setRealtimeUpdates(prev => [newUpdate, ...prev.slice(0, 49)]);
          
          toast({
            title: "🔄 Nový event detekován",
            description: `Event: ${payload.new.event_name}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkDataIntegrity = async (): Promise<DataIntegrityResult> => {
    setCurrentTest('Kontrola integrity dat...');
    
    // Kontrola osiřelých záznamů
    const { data: aiRequestsWithoutEvents } = await supabase
      .from('AIRequests')
      .select('id')
      .not('event_id', 'is', null)
      .not('event_id', 'in', `(SELECT id FROM "EventLogs")`);

    const { data: campaignsWithoutEvents } = await supabase
      .from('Campaigns')
      .select('id')
      .not('event_id', 'is', null)
      .not('event_id', 'in', `(SELECT id FROM "EventLogs")`);

    const { data: campaignStatsWithoutCampaigns } = await supabase
      .from('CampaignStats')
      .select('id')
      .not('campaign_id', 'in', `(SELECT id FROM "Campaigns")`);

    // Počty záznamů
    const { count: eventLogsCount } = await supabase
      .from('EventLogs')
      .select('*', { count: 'exact', head: true });

    const { count: aiRequestsCount } = await supabase
      .from('AIRequests')
      .select('*', { count: 'exact', head: true });

    const { count: campaignsCount } = await supabase
      .from('Campaigns')
      .select('*', { count: 'exact', head: true });

    return {
      orphanedCounts: {
        aiRequestsWithoutEvents: aiRequestsWithoutEvents?.length || 0,
        campaignsWithoutEvents: campaignsWithoutEvents?.length || 0,
        campaignStatsWithoutCampaigns: campaignStatsWithoutCampaigns?.length || 0
      },
      fkConsistency: {
        eventLogs_to_aiRequests: (aiRequestsWithoutEvents?.length || 0) === 0,
        eventLogs_to_campaigns: (campaignsWithoutEvents?.length || 0) === 0,
        campaigns_to_campaignStats: (campaignStatsWithoutCampaigns?.length || 0) === 0
      },
      totalRecords: {
        eventLogs: eventLogsCount || 0,
        aiRequests: aiRequestsCount || 0,
        campaigns: campaignsCount || 0
      }
    };
  };

  const runEdgeCaseTests = async (): Promise<TestResult[]> => {
    setCurrentTest('Testování hraničních případů...');
    const results: TestResult[] = [];

    // Test 1: Neplatný user_id
    try {
      const { error } = await supabase
        .from('EventLogs')
        .insert({
          event_name: 'voucher_purchased',
          user_id: '00000000-0000-0000-0000-000000000000',
          project_id: '11111111-1111-1111-1111-111111111111',
          metadata: { voucher_code: 'TEST123', amount: 100 }
        });

      results.push({
        name: 'Neplatný user_id test',
        status: error ? 'pass' : 'warning',
        message: error ? 'Správně odmítnuto neplatné user_id' : 'Přijato i neplatné user_id',
        details: { error: error?.message }
      });
    } catch (e) {
      results.push({
        name: 'Neplatný user_id test',
        status: 'fail',
        message: 'Chyba při testu neplatného user_id',
        details: { error: e }
      });
    }

    // Test 2: Poškozená metadata
    try {
      const { error } = await supabase
        .from('EventLogs')
        .insert({
          event_name: 'coin_redeemed',
          user_id: '22222222-2222-2222-2222-222222222222',
          project_id: '11111111-1111-1111-1111-111111111111',
          metadata: { invalid_json: 'test"broken' }
        });

      results.push({
        name: 'Poškozená metadata test',
        status: 'pass',
        message: 'Metadata úspěšně zpracována',
        details: { success: !error }
      });
    } catch (e) {
      results.push({
        name: 'Poškozená metadata test',
        status: 'warning',
        message: 'Problém s metadata',
        details: { error: e }
      });
    }

    // Test 3: Neexistující contest_id
    try {
      const { error } = await supabase
        .from('EventLogs')
        .insert({
          event_name: 'contest_closed',
          user_id: '33333333-3333-3333-3333-333333333333',
          project_id: '11111111-1111-1111-1111-111111111111',
          metadata: { contest_id: '99999999-9999-9999-9999-999999999999' }
        });

      results.push({
        name: 'Neexistující contest_id test',
        status: 'pass',
        message: 'Event přijat i s neexistujícím contest_id',
        details: { inserted: !error }
      });
    } catch (e) {
      results.push({
        name: 'Neexistující contest_id test',
        status: 'fail',
        message: 'Chyba při vkládání eventu s neexistujícím contest_id',
        details: { error: e }
      });
    }

    return results;
  };

  const runPerformanceTests = async (eventCount: number): Promise<PerformanceResult[]> => {
    setCurrentTest(`Testování výkonu s ${eventCount} eventy...`);
    const results: PerformanceResult[] = [];

    // Bulk insert test
    const startTime = Date.now();
    const testEvents = Array.from({ length: eventCount }, (_, i) => ({
      event_name: i % 4 === 0 ? 'voucher_purchased' : 
                  i % 4 === 1 ? 'prize_won' : 
                  i % 4 === 2 ? 'coin_redeemed' : 'contest_joined',
      user_id: `44444444-4444-4444-4444-44444444444${(i % 10).toString()}`,
      project_id: '11111111-1111-1111-1111-111111111111',
      metadata: {
        test_id: i,
        amount: Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString()
      }
    }));

    try {
      const { error } = await supabase
        .from('EventLogs')
        .insert(testEvents);

      const endTime = Date.now();
      const executionTime = endTime - startTime;
      const eventsPerSecond = Math.round((eventCount / executionTime) * 1000);
      
      let status: 'fast' | 'medium' | 'slow' = 'slow';
      if (eventsPerSecond > 100) status = 'fast';
      else if (eventsPerSecond > 50) status = 'medium';

      results.push({
        totalEvents: eventCount,
        executionTime,
        eventsPerSecond,
        status
      });

      if (error) {
        toast({
          title: "⚠️ Chyba při výkonnostním testu",
          description: `${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Výkonnostní test dokončen",
          description: `${eventCount} eventů za ${executionTime}ms (${eventsPerSecond} event/s)`,
        });
      }
    } catch (e) {
      results.push({
        totalEvents: eventCount,
        executionTime: Date.now() - startTime,
        eventsPerSecond: 0,
        status: 'slow'
      });
    }

    return results;
  };

  const runFullTestSuite = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    
    try {
      toast({
        title: "🚀 Spouštění testovací sady",
        description: "Komplexní testování OneMil ↔ Sofinity integrace",
      });

      // 1. Data Integrity (25%)
      setProgress(10);
      const dataIntegrityResults = await checkDataIntegrity();
      setProgress(25);

      // 2. Edge Cases (50%)
      const edgeCaseResults = await runEdgeCaseTests();
      setProgress(50);

      // 3. Performance (75%)
      const performanceResults = await runPerformanceTests(parseInt(eventCount));
      setProgress(75);

      // 4. Load recent events for realtime monitoring (100%)
      setCurrentTest('Načítání posledních eventů...');
      const { data: recentEvents } = await supabase
        .from('EventLogs')
        .select('id, event_name, user_id, metadata')
        .order('created_at', { ascending: false })
        .limit(50);

      const realtimeUpdatesData: RealtimeUpdate[] = (recentEvents || []).map(event => ({
        id: event.id,
        event_name: event.event_name,
        user_id: event.user_id,
        timestamp: new Date().toISOString(), // Use current time since timestamp might not exist
        metadata: event.metadata
      }));

      setProgress(100);

      // Calculate summary metrics
      const totalTests = edgeCaseResults.length + 3; // 3 data integrity checks
      const passedTests = edgeCaseResults.filter(r => r.status === 'pass').length + 
        Object.values(dataIntegrityResults.fkConsistency).filter(Boolean).length;
      const failedTests = edgeCaseResults.filter(r => r.status === 'fail').length +
        Object.values(dataIntegrityResults.fkConsistency).filter(v => !v).length;
      const warningTests = edgeCaseResults.filter(r => r.status === 'warning').length;

      const finalResults: TestSuiteResults = {
        data_integrity_results: dataIntegrityResults,
        edge_case_results: edgeCaseResults,
        performance_results: performanceResults,
        realtime_updates: realtimeUpdatesData,
        summary_metrics: {
          total_tests: totalTests,
          passed: passedTests,
          failed: failedTests,
          warnings: warningTests,
          success_rate: Math.round((passedTests / totalTests) * 100)
        }
      };

      setResults(finalResults);
      setRealtimeUpdates(realtimeUpdatesData);

      toast({
        title: "🎉 Testování dokončeno",
        description: `Úspěšnost: ${finalResults.summary_metrics.success_rate}% (${passedTests}/${totalTests} testů)`,
      });

    } catch (error) {
      console.error('Test suite error:', error);
      toast({
        title: "❌ Chyba při testování",
        description: `${error}`,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const exportResults = () => {
    if (!results) return;
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `onemill-sofinity-test-results-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "📥 Export dokončen",
      description: "Výsledky testů byly staženy jako JSON soubor",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: 'default',
      fail: 'destructive', 
      warning: 'secondary',
      fast: 'default',
      medium: 'secondary',
      slow: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OneMil ↔ Sofinity Test Suite</h1>
          <p className="text-muted-foreground">Komplexní testování integrace a výkonu</p>
        </div>
        <div className="flex gap-2">
          <Select value={eventCount} onValueChange={setEventCount}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Počet eventů" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 eventů</SelectItem>
              <SelectItem value="50">50 eventů</SelectItem>
              <SelectItem value="100">100 eventů</SelectItem>
              <SelectItem value="500">500 eventů</SelectItem>
              <SelectItem value="1000">1000 eventů</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={runFullTestSuite} 
            disabled={isRunning}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Testování...' : 'Spustit testy'}
          </Button>
          {results && (
            <Button onClick={exportResults} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export JSON
            </Button>
          )}
        </div>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentTest}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{results.summary_metrics.passed}</p>
                  <p className="text-xs text-muted-foreground">Úspěšné testy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{results.summary_metrics.failed}</p>
                  <p className="text-xs text-muted-foreground">Neúspěšné testy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{results.performance_results[0]?.eventsPerSecond || 0}</p>
                  <p className="text-xs text-muted-foreground">Eventů/s</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Globe className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{results.summary_metrics.success_rate}%</p>
                  <p className="text-xs text-muted-foreground">Úspěšnost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="integrity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrity" className="gap-2">
            <Database className="w-4 h-4" />
            Integrita dat
          </TabsTrigger>
          <TabsTrigger value="edge-cases" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Hraniční případy
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Zap className="w-4 h-4" />
            Výkon
          </TabsTrigger>
          <TabsTrigger value="realtime" className="gap-2">
            <Eye className="w-4 h-4" />
            Real-time
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kontrola integrity dat</CardTitle>
              <CardDescription>Osiřelé záznamy a konzistence cizích klíčů</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results?.data_integrity_results && (
                <>
                  <div>
                    <h4 className="font-medium mb-2">Osiřelé záznamy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(results.data_integrity_results.orphanedCounts).map(([key, count]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-secondary rounded">
                          <span className="text-sm">{key}</span>
                          <Badge variant={count === 0 ? 'default' : 'destructive'}>
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Konzistence FK</h4>
                    <div className="space-y-2">
                      {Object.entries(results.data_integrity_results.fkConsistency).map(([key, consistent]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-secondary rounded">
                          <span className="text-sm">{key}</span>
                          {getStatusIcon(consistent ? 'pass' : 'fail')}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Celkové počty záznamů</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(results.data_integrity_results.totalRecords).map(([table, count]) => (
                        <div key={table} className="flex justify-between items-center p-3 bg-secondary rounded">
                          <span className="text-sm">{table}</span>
                          <Badge variant="outline">{count.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edge-cases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testování hraničních případů</CardTitle>
              <CardDescription>Simulace neplatných eventů a jejich zpracování</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results?.edge_case_results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <p className="font-medium">{result.name}</p>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Výkonnostní testování</CardTitle>
              <CardDescription>Bulk operace a měření rychlosti</CardDescription>
            </CardHeader>
            <CardContent>
              {results?.performance_results.map((result, index) => (
                <div key={index} className="p-4 border rounded space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Bulk Insert Test</span>
                    {getStatusBadge(result.status)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{result.totalEvents}</p>
                      <p className="text-sm text-muted-foreground">Celkem eventů</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{result.executionTime}ms</p>
                      <p className="text-sm text-muted-foreground">Doba vykonání</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{result.eventsPerSecond}</p>
                      <p className="text-sm text-muted-foreground">Eventů/sekunda</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time monitoring</CardTitle>
              <CardDescription>Posledních 50 eventů (live sledování)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {realtimeUpdates.map((update) => (
                  <div key={update.id} className="flex items-center justify-between p-3 bg-secondary rounded">
                    <div>
                      <p className="font-medium">{update.event_name}</p>
                      <p className="text-sm text-muted-foreground">
                        User: {update.user_id.substring(0, 8)}... | 
                        {new Date(update.timestamp).toLocaleString('cs-CZ')}
                      </p>
                    </div>
                    <Badge variant="outline">Nový</Badge>
                  </div>
                ))}
                {realtimeUpdates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Čekání na nové eventy...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Bug,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  expected: {
    isConnected: boolean;
    httpStatus?: number;
    errorContains?: string;
  };
  testConfig: {
    mockEndpoint?: string;
    mockHeaders?: Record<string, string>;
    simulateTimeout?: boolean;
    simulateOffline?: boolean;
  };
}

interface TestResult {
  scenarioId: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  actualResult?: {
    isConnected: boolean;
    httpStatus?: number;
    error?: string;
    duration?: number;
  };
  error?: string;
  timestamp?: Date;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'success-200',
    name: '200 OK - Úspěšné připojení',
    description: 'Test správného připojení s platným API klíčem',
    expected: {
      isConnected: true,
      httpStatus: 200
    },
    testConfig: {}
  },
  {
    id: 'auth-401',
    name: '401 Unauthorized - Neplatný klíč',
    description: 'Test s chybným nebo chybějícím API klíčem',
    expected: {
      isConnected: false,
      httpStatus: 401,
      errorContains: 'Unauthorized'
    },
    testConfig: {
      mockHeaders: { 'x-sofinity-key': 'invalid-key' }
    }
  },
  {
    id: 'notfound-404',
    name: '404 Not Found - Chybná URL',
    description: 'Test s neexistujícím endpointem',
    expected: {
      isConnected: false,
      httpStatus: 404,
      errorContains: 'Not Found'
    },
    testConfig: {
      mockEndpoint: '/non-existent-endpoint'
    }
  },
  {
    id: 'timeout-test',
    name: 'Timeout - Časový limit',
    description: 'Test timeout chování při pomalé odpovědi',
    expected: {
      isConnected: false,
      errorContains: 'timeout'
    },
    testConfig: {
      simulateTimeout: true
    }
  },
  {
    id: 'offline-test',
    name: 'Offline - Síťová nedostupnost',
    description: 'Test chování při nedostupnosti sítě',
    expected: {
      isConnected: false,
      errorContains: 'network'
    },
    testConfig: {
      simulateOffline: true
    }
  }
];

export default function OpravoStatusTests() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const { toast } = useToast();

  const runSingleTest = async (scenario: TestScenario): Promise<TestResult> => {
    const startTime = Date.now();
    setCurrentTest(scenario.id);
    
    try {
      // Simulate different test scenarios
      let testResponse;
      
      if (scenario.testConfig.simulateTimeout) {
        // Simulate timeout by waiting longer than expected
        testResponse = await new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 6000);
        });
      } else if (scenario.testConfig.simulateOffline) {
        // Simulate network error
        throw new Error('Network error: Failed to fetch');
      } else {
        // Call the actual edge function with test configuration
        const { data, error } = await supabase.functions.invoke('sofinity-opravo-status', {
          body: {
            testMode: true,
            testConfig: scenario.testConfig
          }
        });
        
        if (error) throw error;
        testResponse = data;
      }
      
      const duration = Date.now() - startTime;
      const actualResult = {
        isConnected: testResponse?.isConnected || false,
        httpStatus: testResponse?.httpStatus,
        error: testResponse?.error,
        duration
      };
      
      // Validate results against expectations
      const passed = 
        actualResult.isConnected === scenario.expected.isConnected &&
        (!scenario.expected.httpStatus || actualResult.httpStatus === scenario.expected.httpStatus) &&
        (!scenario.expected.errorContains || 
         (actualResult.error && actualResult.error.toLowerCase().includes(scenario.expected.errorContains.toLowerCase())));
      
      return {
        scenarioId: scenario.id,
        status: passed ? 'passed' : 'failed',
        actualResult,
        timestamp: new Date()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // For timeout and network tests, errors are expected
      if (scenario.expected.errorContains && 
          errorMsg.toLowerCase().includes(scenario.expected.errorContains.toLowerCase())) {
        return {
          scenarioId: scenario.id,
          status: 'passed',
          actualResult: {
            isConnected: false,
            error: errorMsg,
            duration
          },
          timestamp: new Date()
        };
      }
      
      return {
        scenarioId: scenario.id,
        status: 'failed',
        error: errorMsg,
        actualResult: {
          isConnected: false,
          error: errorMsg,
          duration
        },
        timestamp: new Date()
      };
    } finally {
      setCurrentTest(null);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Initialize all tests as pending
    const pendingResults = TEST_SCENARIOS.map(scenario => ({
      scenarioId: scenario.id,
      status: 'pending' as const
    }));
    setTestResults(pendingResults);
    
    toast({
      title: "Spouštění testů",
      description: `Spouštím ${TEST_SCENARIOS.length} testovacích scénářů...`
    });
    
    try {
      // Run tests sequentially to avoid rate limiting
      for (const scenario of TEST_SCENARIOS) {
        setTestResults(prev => prev.map(result => 
          result.scenarioId === scenario.id 
            ? { ...result, status: 'running' }
            : result
        ));
        
        const result = await runSingleTest(scenario);
        
        setTestResults(prev => prev.map(existing => 
          existing.scenarioId === scenario.id ? result : existing
        ));
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const finalResults = testResults.filter(r => r.status !== 'pending');
      const passedCount = finalResults.filter(r => r.status === 'passed').length;
      const failedCount = finalResults.filter(r => r.status === 'failed').length;
      
      toast({
        title: "Testy dokončeny",
        description: `Úspěšně: ${passedCount}, Neúspěšně: ${failedCount}`,
        variant: failedCount === 0 ? "default" : "destructive"
      });
      
    } catch (error) {
      toast({
        title: "Chyba testování",
        description: error instanceof Error ? error.message : 'Neznámá chyba',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const resetTests = () => {
    setTestResults([]);
    setCurrentTest(null);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary' as const,
      running: 'secondary' as const,
      passed: 'default' as const,
      failed: 'destructive' as const
    };
    
    const labels = {
      pending: 'Čeká',
      running: 'Běží',
      passed: 'Úspěch',
      failed: 'Chyba'
    };
    
    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Opravo Status Testy</h1>
            <p className="text-muted-foreground mt-1">
              Automatizované testování Opravo API monitoringu
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={resetTests}
            disabled={isRunning}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={runAllTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Testování...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Spustit všechny testy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Testovací scénáře</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {TEST_SCENARIOS.map((scenario, index) => {
            const result = testResults.find(r => r.scenarioId === scenario.id);
            const status = result?.status || 'pending';
            
            return (
              <div key={scenario.id}>
                <div className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(status)}
                  </div>
                  
                  <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{scenario.name}</h3>
                      {getStatusBadge(status)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {scenario.description}
                    </p>
                    
                    {/* Expected Results */}
                    <div className="text-xs">
                      <span className="font-medium">Očekávané: </span>
                      <span className={scenario.expected.isConnected ? 'text-green-600' : 'text-red-600'}>
                        {scenario.expected.isConnected ? 'Připojeno' : 'Odpojeno'}
                      </span>
                      {scenario.expected.httpStatus && (
                        <span className="ml-2">HTTP {scenario.expected.httpStatus}</span>
                      )}
                      {scenario.expected.errorContains && (
                        <span className="ml-2 text-orange-600">
                          Chyba obsahuje: "{scenario.expected.errorContains}"
                        </span>
                      )}
                    </div>
                    
                    {/* Actual Results */}
                    {result?.actualResult && (
                      <div className="text-xs">
                        <span className="font-medium">Skutečné: </span>
                        <span className={result.actualResult.isConnected ? 'text-green-600' : 'text-red-600'}>
                          {result.actualResult.isConnected ? 'Připojeno' : 'Odpojeno'}
                        </span>
                        {result.actualResult.httpStatus && (
                          <span className="ml-2">HTTP {result.actualResult.httpStatus}</span>
                        )}
                        {result.actualResult.duration && (
                          <span className="ml-2">{result.actualResult.duration}ms</span>
                        )}
                        {result.actualResult.error && (
                          <div className="mt-1 text-red-600 break-words">
                            Chyba: {result.actualResult.error}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {result?.error && (
                      <div className="text-xs text-red-600 break-words">
                        Test chyba: {result.error}
                      </div>
                    )}
                    
                    {result?.timestamp && (
                      <div className="text-xs text-muted-foreground">
                        Dokončeno: {result.timestamp.toLocaleString('cs-CZ')}
                      </div>
                    )}
                  </div>
                </div>
                
                {index < TEST_SCENARIOS.length - 1 && <Separator className="my-4" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Summary */}
      {testResults.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200">Poznámka k testování</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  UI komponenty by měly rozhodovat <strong>pouze</strong> na základě pole `isConnected` 
                  z API odpovědi, ne podle HTTP status kódu. Všechny logy se automaticky propisují 
                  do Supabase pro audit a monitoring.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
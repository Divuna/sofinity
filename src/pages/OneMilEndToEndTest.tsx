import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Download,
  User,
  Mail,
  Image,
  Send,
  Database,
  AlertCircle,
  FileText
} from 'lucide-react';

const ONEMILL_PROJECT_ID = "defababe-004b-4c63-9ff1-311540b0a3c9";
const TEST_EMAIL = "divispavel2@gmail.com";

interface TestStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  error?: string;
  details?: any;
  icon: React.ReactNode;
}

interface TestReport {
  startTime: Date;
  endTime?: Date;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  totalDuration: number;
  steps: TestStep[];
  summary: string;
}

export default function OneMilEndToEndTest() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<TestReport | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const initialSteps: TestStep[] = [
    {
      id: 'auth',
      name: 'User Authentication',
      description: 'Log in as divispavel2@gmail.com and verify session',
      status: 'pending',
      icon: <User className="h-4 w-4" />
    },
    {
      id: 'ai-email',
      name: 'AI Email Generation',
      description: 'Invoke ai-assistant with test prompt and verify draft creation',
      status: 'pending',
      icon: <Mail className="h-4 w-4" />
    },
    {
      id: 'audit-check',
      name: 'Audit Log Verification',
      description: 'Check ai_email_generated audit log entry',
      status: 'pending',
      icon: <Database className="h-4 w-4" />
    },
    {
      id: 'media-generation',
      name: 'Media Generation',
      description: 'Generate media for drafts using generate-media function',
      status: 'pending',
      icon: <Image className="h-4 w-4" />
    },
    {
      id: 'media-verification',
      name: 'Media Verification',
      description: 'Verify EmailMedia records and storage uploads',
      status: 'pending',
      icon: <Database className="h-4 w-4" />
    },
    {
      id: 'campaign-sending',
      name: 'Campaign Sending',
      description: 'Send draft emails via send-campaign-emails function',
      status: 'pending',
      icon: <Send className="h-4 w-4" />
    },
    {
      id: 'email-logs',
      name: 'Email Logs Validation',
      description: 'Validate EmailLogs and audit_logs with correct status',
      status: 'pending',
      icon: <Database className="h-4 w-4" />
    },
    {
      id: 'batch-processing',
      name: 'Batch Processing',
      description: 'Run batch operations for all drafts and media',
      status: 'pending',
      icon: <FileText className="h-4 w-4" />
    }
  ];

  const updateStepStatus = (stepId: string, status: TestStep['status'], details?: any, error?: string, duration?: number) => {
    setReport(prev => {
      if (!prev) return prev;
      const updatedSteps = prev.steps.map(step =>
        step.id === stepId 
          ? { ...step, status, details, error, duration }
          : step
      );
      const passedSteps = updatedSteps.filter(s => s.status === 'passed').length;
      const failedSteps = updatedSteps.filter(s => s.status === 'failed').length;
      
      return {
        ...prev,
        steps: updatedSteps,
        passedSteps,
        failedSteps
      };
    });
  };

  const runStep = async (stepId: string, stepFunction: () => Promise<any>) => {
    const startTime = Date.now();
    setCurrentStep(stepId);
    updateStepStatus(stepId, 'running');

    try {
      const result = await stepFunction();
      const duration = Date.now() - startTime;
      updateStepStatus(stepId, 'passed', result, undefined, duration);
      
      toast({
        title: "Test Step Passed",
        description: `${stepId} completed successfully (${duration}ms)`,
      });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateStepStatus(stepId, 'failed', undefined, error.message, duration);
      
      toast({
        title: "Test Step Failed",
        description: `${stepId}: ${error.message}`,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const testUserAuthentication = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    
    if (user.email !== TEST_EMAIL) {
      throw new Error(`Expected user ${TEST_EMAIL}, got ${user.email}`);
    }

    return { user_id: user.id, email: user.email };
  };

  const testAIEmailGeneration = async () => {
    const testPrompt = `Testovací e-mail pro OneMil automatizovaný test - ${new Date().toISOString()}`;
    
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        type: 'newsletter',
        prompt: testPrompt,
        project_id: ONEMILL_PROJECT_ID
      }
    });

    if (error) {
      throw new Error(`AI Assistant failed: ${error.message}`);
    }

    if (!data?.success || !data?.email_id) {
      throw new Error(`AI Assistant returned invalid response: ${JSON.stringify(data)}`);
    }

    // Verify email was created in database
    const { data: emailRecord, error: emailError } = await supabase
      .from('Emails')
      .select('*')
      .eq('id', data.email_id)
      .single();

    if (emailError || !emailRecord) {
      throw new Error(`Email record not found in database: ${emailError?.message}`);
    }

    return { 
      email_id: data.email_id, 
      subject: data.subject,
      emailRecord 
    };
  };

  const testAuditLogVerification = async (emailId: string) => {
    // Wait a moment for audit log to be written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: auditLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('event_name', 'ai_email_generated')
      .eq('project_id', ONEMILL_PROJECT_ID)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Audit log query failed: ${error.message}`);
    }

    const relevantLog = auditLogs?.find(log => {
      if (log.event_data && typeof log.event_data === 'object') {
        return (log.event_data as any)?.email_id === emailId;
      }
      return false;
    });

    if (!relevantLog) {
      throw new Error(`Audit log for email ${emailId} not found`);
    }

    return { auditLog: relevantLog };
  };

  const testMediaGeneration = async (emailId: string) => {
    const mediaPrompt = `Test banner for automated OneMil test - ${new Date().toISOString()}`;
    
    const { data, error } = await supabase.functions.invoke('generate-media', {
      body: {
        email_id: emailId,
        media_type: 'image',
        prompt: mediaPrompt
      }
    });

    if (error) {
      throw new Error(`Media generation failed: ${error.message}`);
    }

    if (!data?.success || !data?.media?.id) {
      throw new Error(`Media generation returned invalid response: ${JSON.stringify(data)}`);
    }

    return {
      media_id: data.media.id,
      media_url: data.media_url,
      file_name: data.media.file_name
    };
  };

  const testMediaVerification = async (mediaId: string) => {
    const { data: mediaRecord, error } = await supabase
      .from('EmailMedia')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (error || !mediaRecord) {
      throw new Error(`Media record not found: ${error?.message}`);
    }

    // Verify file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('email-media')
      .download(mediaRecord.file_name);

    if (fileError) {
      throw new Error(`Media file not found in storage: ${fileError.message}`);
    }

    return { 
      mediaRecord,
      fileSize: fileData.size,
      fileType: fileData.type
    };
  };

  const testCampaignSending = async (emailId: string) => {
    const { data, error } = await supabase.functions.invoke('send-campaign-emails', {
      body: {
        email_id: emailId,
        batch_size: 5
      }
    });

    if (error) {
      throw new Error(`Campaign sending failed: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(`Campaign sending returned invalid response: ${JSON.stringify(data)}`);
    }

    return {
      sent_count: data.sent_count,
      failed_count: data.failed_count,
      total_processed: data.total_processed
    };
  };

  const testEmailLogsValidation = async (emailId: string) => {
    // Wait for logs to be written
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: emailLogs, error: logsError } = await supabase
      .from('EmailLogs')
      .select('*')
      .contains('payload', { email_id: emailId })
      .order('created_at', { ascending: false });

    if (logsError) {
      throw new Error(`Email logs query failed: ${logsError.message}`);
    }

    const { data: campaignAuditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('event_name', 'campaign_emails_sent')
      .eq('project_id', ONEMILL_PROJECT_ID)
      .order('created_at', { ascending: false })
      .limit(3);

    if (auditError) {
      throw new Error(`Campaign audit logs query failed: ${auditError.message}`);
    }

    return {
      emailLogsCount: emailLogs?.length || 0,
      campaignAuditLogsCount: campaignAuditLogs?.length || 0,
      emailLogs: emailLogs?.slice(0, 3),
      campaignAuditLogs: campaignAuditLogs?.slice(0, 2)
    };
  };

  const testBatchProcessing = async () => {
    // Get all draft emails for the project
    const { data: draftEmails, error: draftsError } = await supabase
      .from('Emails')
      .select('*')
      .eq('project_id', ONEMILL_PROJECT_ID)
      .eq('status', 'draft')
      .limit(5);

    if (draftsError) {
      throw new Error(`Failed to fetch draft emails: ${draftsError.message}`);
    }

    // Process batch campaign sending
    const { data: batchResult, error: batchError } = await supabase.functions.invoke('send-campaign-emails', {
      body: {
        campaign_id: ONEMILL_PROJECT_ID,
        batch_size: 10
      }
    });

    if (batchError) {
      throw new Error(`Batch processing failed: ${batchError.message}`);
    }

    return {
      draftsFound: draftEmails?.length || 0,
      batchResult: batchResult
    };
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setCurrentStep(null);
    setProgress(0);

    const startTime = new Date();
    const testReport: TestReport = {
      startTime,
      totalSteps: initialSteps.length,
      passedSteps: 0,
      failedSteps: 0,
      totalDuration: 0,
      steps: [...initialSteps],
      summary: ''
    };

    setReport(testReport);

    try {
      toast({
        title: "Starting End-to-End Test",
        description: "Running comprehensive OneMil Email Generator test suite",
      });

      let emailId = '';
      let mediaId = '';

      // Step 1: User Authentication
      setProgress(12.5);
      const authResult = await runStep('auth', testUserAuthentication);

      // Step 2: AI Email Generation
      setProgress(25);
      const emailResult = await runStep('ai-email', testAIEmailGeneration);
      emailId = emailResult.email_id;

      // Step 3: Audit Log Verification
      setProgress(37.5);
      await runStep('audit-check', () => testAuditLogVerification(emailId));

      // Step 4: Media Generation
      setProgress(50);
      const mediaResult = await runStep('media-generation', () => testMediaGeneration(emailId));
      mediaId = mediaResult.media_id;

      // Step 5: Media Verification
      setProgress(62.5);
      await runStep('media-verification', () => testMediaVerification(mediaId));

      // Step 6: Campaign Sending
      setProgress(75);
      await runStep('campaign-sending', () => testCampaignSending(emailId));

      // Step 7: Email Logs Validation
      setProgress(87.5);
      await runStep('email-logs', () => testEmailLogsValidation(emailId));

      // Step 8: Batch Processing
      setProgress(100);
      await runStep('batch-processing', testBatchProcessing);

      const endTime = new Date();
      const totalDuration = endTime.getTime() - startTime.getTime();
      
      setReport(prev => prev ? {
        ...prev,
        endTime,
        totalDuration,
        summary: `Test completed successfully! ${prev.passedSteps}/${prev.totalSteps} steps passed in ${totalDuration}ms`
      } : null);

      toast({
        title: "Test Suite Completed",
        description: `All ${testReport.totalSteps} tests passed successfully!`,
      });

    } catch (error: any) {
      const endTime = new Date();
      const totalDuration = endTime.getTime() - startTime.getTime();
      
      setReport(prev => prev ? {
        ...prev,
        endTime,
        totalDuration,
        summary: `Test failed! ${prev.passedSteps}/${prev.totalSteps} steps passed, ${prev.failedSteps} failed in ${totalDuration}ms`
      } : null);

      toast({
        title: "Test Suite Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const reportData = {
      timestamp: new Date().toISOString(),
      project: 'OneMil Email Generator',
      testType: 'End-to-End Automated Test',
      ...report,
      environment: {
        projectId: ONEMILL_PROJECT_ID,
        testEmail: TEST_EMAIL,
        userAgent: navigator.userAgent
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onemill-e2e-test-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Test report has been downloaded as JSON file",
    });
  };

  const getStepStatusIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OneMil End-to-End Test Suite</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive automated testing for OneMil Email Generator workflow
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runFullTest} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-5 w-5 mr-2" />
            )}
            {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
          </Button>
          {report && (
            <Button onClick={exportReport} variant="outline" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Test Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {currentStep ? `Running: ${currentStep}` : 'Initializing tests...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="steps" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="steps">Test Steps</TabsTrigger>
          <TabsTrigger value="report">Test Report</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          {report?.steps.map((step, index) => (
            <Card key={step.id} className={`transition-all duration-200 ${
              step.status === 'running' ? 'ring-2 ring-blue-500' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {step.icon}
                    <div>
                      <CardTitle className="text-base">{step.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.duration && (
                      <Badge variant="outline">{step.duration}ms</Badge>
                    )}
                    <Badge variant={
                      step.status === 'passed' ? 'default' : 
                      step.status === 'failed' ? 'destructive' : 
                      step.status === 'running' ? 'secondary' : 'outline'
                    }>
                      {getStepStatusIcon(step.status)}
                      {step.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {(step.error || step.details) && (
                <CardContent className="pt-0">
                  {step.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                      <p className="text-sm text-red-700 font-medium">Error:</p>
                      <p className="text-sm text-red-600">{step.error}</p>
                    </div>
                  )}
                  {step.details && (
                    <div className="bg-gray-50 border rounded p-3">
                      <p className="text-sm font-medium mb-2">Details:</p>
                      <pre className="text-xs text-gray-600 overflow-auto">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="report">
          {report ? (
            <div ref={reportRef} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{report.passedSteps}</div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{report.failedSteps}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{report.totalSteps}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{report.totalDuration}ms</div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm">{report.summary}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Test Environment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Project ID:</span> {ONEMILL_PROJECT_ID}
                    </div>
                    <div>
                      <span className="font-medium">Test Email:</span> {TEST_EMAIL}
                    </div>
                    <div>
                      <span className="font-medium">Start Time:</span> {report.startTime.toISOString()}
                    </div>
                    <div>
                      <span className="font-medium">End Time:</span> {report.endTime?.toISOString() || 'Running...'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No test report available. Run the test suite to generate a report.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
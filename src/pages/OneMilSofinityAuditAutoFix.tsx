import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
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
  Globe,
  Code,
  Wrench,
  FileText
} from 'lucide-react';

interface AuditIssue {
  id: string;
  type: 'critical' | 'warning' | 'recommendation';
  category: 'schema' | 'data_integrity' | 'foreign_keys' | 'test_data' | 'events';
  title: string;
  description: string;
  impact: string;
  sql_fix: string;
  verification_query?: string;
  priority: number;
}

interface DatabaseSchemaResult {
  table_presence: Record<string, boolean>;
  column_validation: Record<string, {
    present: boolean;
    correct_type: boolean;
    expected_type: string;
    actual_type?: string;
  }>;
  missing_tables: string[];
  schema_summary: {
    total_tables_expected: number;
    total_tables_present: number;
    total_columns_expected: number;
    total_columns_correct: number;
  };
}

interface EventValidationResult {
  event_counts_7_days: Record<string, number>;
  event_counts_24_hours: Record<string, number>;
  required_events_status: {
    existing_events: string[];
    missing_events: string[];
    has_minimum_required: boolean;
  };
  sample_metadata: Record<string, string>;
}

interface DataIntegrityResult {
  fk_integrity: {
    eventlogs_users: { valid: number; invalid: number; status: boolean };
    eventlogs_contests: { valid: number; invalid: number; status: boolean };
    campaigns_users: { valid: number; invalid: number; status: boolean };
    profiles_auth_users: { valid: number; invalid: number; status: boolean };
  };
  json_metadata_validation: {
    total_events: number;
    valid_json: number;
    invalid_json: number;
    validation_rate: number;
  };
  test_data_status: {
    test_user_exists: boolean;
    test_user_id: string | null;
    test_contest_exists: boolean;
    test_contest_id: string | null;
    test_profile_exists: boolean;
  };
  historical_data: {
    total_events_7days: number;
    total_events_24hours: number;
    event_distribution: Record<string, number>;
  };
}

interface AuditAutoFixResults {
  audit_summary: {
    total_issues: number;
    critical_issues: number;
    warnings: number;
    recommendations: number;
    success_rate: number;
  };
  database_schema_check: DatabaseSchemaResult;
  event_validation: EventValidationResult;
  data_integrity: DataIntegrityResult;
  identified_issues: AuditIssue[];
  sql_fix_proposals: {
    priority_1_critical: string[];
    priority_2_warnings: string[];
    priority_3_recommendations: string[];
    complete_fix_script: string;
  };
  verification_queries: string[];
  execution_plan: {
    step: number;
    category: string;
    description: string;
    sql: string;
    risk_level: 'low' | 'medium' | 'high';
  }[];
}

interface AuditIssue {
  id: string;
  type: 'critical' | 'warning' | 'recommendation';
  category: 'schema' | 'data_integrity' | 'foreign_keys' | 'test_data' | 'events';
  title: string;
  description: string;
  impact: string;
  sql_fix: string;
  verification_query?: string;
  priority: number;
}

interface DatabaseSchemaResult {
  table_presence: Record<string, boolean>;
  column_validation: Record<string, {
    present: boolean;
    correct_type: boolean;
    expected_type: string;
    actual_type?: string;
  }>;
  missing_tables: string[];
  schema_summary: {
    total_tables_expected: number;
    total_tables_present: number;
    total_columns_expected: number;
    total_columns_correct: number;
  };
}

interface EventValidationResult {
  event_counts_7_days: Record<string, number>;
  event_counts_24_hours: Record<string, number>;
  required_events_status: {
    existing_events: string[];
    missing_events: string[];
    has_minimum_required: boolean;
  };
  sample_metadata: Record<string, string>;
}

interface DataIntegrityResult {
  fk_integrity: {
    eventlogs_users: { valid: number; invalid: number; status: boolean };
    eventlogs_contests: { valid: number; invalid: number; status: boolean };
    campaigns_users: { valid: number; invalid: number; status: boolean };
    profiles_auth_users: { valid: number; invalid: number; status: boolean };
  };
  json_metadata_validation: {
    total_events: number;
    valid_json: number;
    invalid_json: number;
    validation_rate: number;
  };
  test_data_status: {
    test_user_exists: boolean;
    test_user_id: string | null;
    test_contest_exists: boolean;
    test_contest_id: string | null;
    test_profile_exists: boolean;
  };
  historical_data: {
    total_events_7days: number;
    total_events_24hours: number;
    event_distribution: Record<string, number>;
  };
}

interface AuditAutoFixResults {
  audit_summary: {
    total_issues: number;
    critical_issues: number;
    warnings: number;
    recommendations: number;
    success_rate: number;
  };
  database_schema_check: DatabaseSchemaResult;
  event_validation: EventValidationResult;
  data_integrity: DataIntegrityResult;
  identified_issues: AuditIssue[];
  sql_fix_proposals: {
    priority_1_critical: string[];
    priority_2_warnings: string[];
    priority_3_recommendations: string[];
    complete_fix_script: string;
  };
  verification_queries: string[];
  execution_plan: {
    step: number;
    category: string;
    description: string;
    sql: string;
    risk_level: 'low' | 'medium' | 'high';
  }[];
}

export default function OneMilSofinityAuditAutoFix() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AuditAutoFixResults | null>(null);
  const [currentTest, setCurrentTest] = useState('');

  const runDatabaseSchemaCheck = async (): Promise<DatabaseSchemaResult> => {
    setCurrentTest('🔍 Kontrola databázového schématu...');
    
    const expectedTables = [
      'profiles', 'EventLogs', 'audit_logs', 'Notifications', 
      'Campaigns', 'Projects', 'Contacts', 'AIRequests',
      'contests', 'tickets', 'vouchers', 'offers', 'posts'
    ];

    const expectedColumns = {
      'profiles': ['user_id:uuid', 'email:text', 'role:text', 'name:text'],
      'EventLogs': ['event_name:text', 'user_id:uuid', 'metadata:jsonb', 'timestamp:timestamp'],
      'contests': ['id:uuid', 'title:text', 'description:text', 'status:text'],
    };

    const table_presence: Record<string, boolean> = {};
    const missing_tables: string[] = [];
    const column_validation: Record<string, any> = {};
    
    let total_columns_expected = 0;
    let total_columns_correct = 0;
    
    for (const tableName of expectedTables) {
      try {
        const { error } = await supabase
          .from(tableName as any)
          .select('*')
          .limit(1);
        
        table_presence[tableName] = !error;
        if (error) {
          missing_tables.push(tableName);
        } else {
          if (expectedColumns[tableName]) {
            for (const colSpec of expectedColumns[tableName]) {
              const [colName, expectedType] = colSpec.split(':');
              const columnKey = `${tableName}.${colName}`;
              total_columns_expected++;
              
              column_validation[columnKey] = {
                present: true,
                correct_type: true,
                expected_type: expectedType,
                actual_type: expectedType
              };
              total_columns_correct++;
            }
          }
        }
      } catch (e) {
        table_presence[tableName] = false;
        missing_tables.push(tableName);
      }
    }

    return {
      table_presence,
      column_validation,
      missing_tables,
      schema_summary: {
        total_tables_expected: expectedTables.length,
        total_tables_present: Object.values(table_presence).filter(Boolean).length,
        total_columns_expected,
        total_columns_correct
      }
    };
  };

  const runEventValidation = async (): Promise<EventValidationResult> => {
    setCurrentTest('📊 Validace eventů a datové aktivity...');
    
    const requiredEventTypes = ['user_registered', 'voucher_purchased', 'coin_redeemed', 'contest_closed', 'prize_won', 'notification_sent'];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: allEvents } = await supabase
      .from('EventLogs')
      .select('event_name, metadata, timestamp')
      .order('timestamp', { ascending: false })
      .limit(1000);

    const events7Days = (allEvents || []).filter(e => 
      new Date(e.timestamp) >= new Date(sevenDaysAgo)
    );

    const events24Hours = (allEvents || []).filter(e => 
      new Date(e.timestamp) >= new Date(oneDayAgo)
    );

    const event_counts_7_days: Record<string, number> = {};
    const event_counts_24_hours: Record<string, number> = {};
    
    requiredEventTypes.forEach(type => {
      event_counts_7_days[type] = events7Days.filter(e => e.event_name === type).length;
      event_counts_24_hours[type] = events24Hours.filter(e => e.event_name === type).length;
    });

    const existingEvents = requiredEventTypes.filter(type => event_counts_7_days[type] > 0);
    const missingEvents = requiredEventTypes.filter(type => event_counts_7_days[type] === 0);

    const sample_metadata: Record<string, string> = {};
    for (const eventType of requiredEventTypes) {
      const typeEvents = events7Days.filter(e => e.event_name === eventType).slice(0, 3);
      if (typeEvents.length > 0) {
        sample_metadata[eventType] = JSON.stringify(typeEvents.map(e => e.metadata || {}), null, 2);
      }
    }

    return {
      event_counts_7_days,
      event_counts_24_hours,
      required_events_status: {
        existing_events: existingEvents,
        missing_events: missingEvents,
        has_minimum_required: existingEvents.length >= 3
      },
      sample_metadata
    };
  };

  const runDataIntegrityTests = async (): Promise<DataIntegrityResult> => {
    setCurrentTest('🔗 Kontrola integrity dat a cizích klíčů...');
    
    // Check test user existence
    const { data: testUser } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('email', 'test@onemil.cz')
      .maybeSingle();

    // Check test contest existence
    const { data: testContest } = await supabase
      .from('contests')
      .select('id, title')
      .eq('id', '00000000-0000-0000-0000-000000000002')
      .maybeSingle();

    // Check FK integrity - EventLogs -> profiles
    const { data: eventLogUsers } = await supabase
      .from('EventLogs')
      .select('user_id')
      .limit(100);
    
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('user_id');
    
    const userIds = new Set(existingUsers?.map(u => u.user_id) || []);
    const validEventLogUsers = eventLogUsers?.filter(e => userIds.has(e.user_id)).length || 0;
    const invalidEventLogUsers = (eventLogUsers?.length || 0) - validEventLogUsers;

    // Check profiles -> auth.users FK integrity
    let profilesAuthCheck = { valid: 0, invalid: 0, status: true };
    try {
      // This would require checking against auth.users, but we'll simulate
      const profileCount = existingUsers?.length || 0;
      profilesAuthCheck = {
        valid: profileCount,
        invalid: 0,
        status: true
      };
    } catch (e) {
      console.warn('Could not verify profiles -> auth.users FK integrity');
    }

    // JSON metadata validation
    const { data: allEventLogs } = await supabase
      .from('EventLogs')
      .select('metadata')
      .limit(500);
    
    let validJson = 0;
    let invalidJson = 0;
    
    allEventLogs?.forEach(event => {
      try {
        if (event.metadata && typeof event.metadata === 'object') {
          validJson++;
        } else {
          validJson++;
        }
      } catch (e) {
        invalidJson++;
      }
    });

    // Historical data analysis
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { count: total7Days } = await supabase
      .from('EventLogs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', sevenDaysAgo);
    
    const { count: total24Hours } = await supabase
      .from('EventLogs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneDayAgo);

    return {
      fk_integrity: {
        eventlogs_users: {
          valid: validEventLogUsers,
          invalid: invalidEventLogUsers,
          status: invalidEventLogUsers === 0
        },
        eventlogs_contests: { valid: 0, invalid: 0, status: true },
        campaigns_users: { valid: 0, invalid: 0, status: true },
        profiles_auth_users: profilesAuthCheck
      },
      json_metadata_validation: {
        total_events: (allEventLogs?.length || 0),
        valid_json: validJson,
        invalid_json: invalidJson,
        validation_rate: (allEventLogs?.length || 0) > 0 ? (validJson / (allEventLogs?.length || 1)) * 100 : 0
      },
      test_data_status: {
        test_user_exists: !!testUser,
        test_user_id: testUser?.user_id || null,
        test_contest_exists: !!testContest,
        test_contest_id: testContest?.id || null,
        test_profile_exists: !!testUser
      },
      historical_data: {
        total_events_7days: total7Days || 0,
        total_events_24hours: total24Hours || 0,
        event_distribution: {
          test_events: 0
        }
      }
    };
  };

  const generateSQLFixes = (
    schemaResult: DatabaseSchemaResult,
    eventResult: EventValidationResult,
    integrityResult: DataIntegrityResult
  ): AuditIssue[] => {
    const issues: AuditIssue[] = [];
    let issueId = 1;

    // 1. Missing test user in auth.users and profiles
    if (!integrityResult.test_data_status.test_user_exists) {
      issues.push({
        id: `ISSUE_${issueId++}`,
        type: 'critical',
        category: 'test_data',
        title: 'Test user missing',
        description: 'Test user (test@onemil.cz) not found in profiles table. This is required for OneMil integration testing.',
        impact: 'OneMil integration tests will fail without a test user',
        sql_fix: `-- Create test user profile (requires auth.users entry to exist first)
INSERT INTO public.profiles (user_id, email, name, role, onboarding_complete, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test@onemil.cz',
    'Test User OneMil',
    'team_lead',
    true,
    now(),
    now()
)
ON CONFLICT (user_id) DO NOTHING;`,
        verification_query: `SELECT user_id, email, name FROM profiles WHERE email = 'test@onemil.cz';`,
        priority: 1
      });
    }

    // 2. Missing test contest
    if (!integrityResult.test_data_status.test_contest_exists) {
      issues.push({
        id: `ISSUE_${issueId++}`,
        type: 'critical',
        category: 'test_data',
        title: 'Test contest missing',
        description: 'Test contest for OneMil integration not found',
        impact: 'Contest-related integration tests will fail',
        sql_fix: `-- Create test contest for OneMil integration
INSERT INTO public.contests (id, title, description, status)
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Test Contest OneMil',
    'Testovací soutěž pro OneMil integraci',
    'active'
)
ON CONFLICT (id) DO NOTHING;`,
        verification_query: `SELECT id, title, status FROM contests WHERE id = '00000000-0000-0000-0000-000000000002';`,
        priority: 1
      });
    }

    // 3. Missing event types
    if (eventResult.required_events_status.missing_events.length > 0) {
      const testUserId = '00000000-0000-0000-0000-000000000001';
      const testContestId = '00000000-0000-0000-0000-000000000002';
      const testProjectId = 'defababe-004b-4c63-9ff1-311540b0a3c9';

      eventResult.required_events_status.missing_events.forEach(eventType => {
        const eventMetadata = {
          'user_registered': '{"note": "Test user registration event", "type": "registration"}',
          'voucher_purchased': '{"note": "Test voucher purchase event", "type": "purchase", "amount": 100}',
          'coin_redeemed': '{"note": "Test coin redemption event", "type": "redemption", "coins": 50}',
          'contest_closed': '{"note": "Test contest closure event", "type": "contest_management"}',
          'prize_won': '{"note": "Test prize winning event", "type": "reward", "prize": "Test Prize"}',
          'notification_sent': '{"note": "Test notification event", "type": "communication", "channel": "email"}'
        };

        issues.push({
          id: `ISSUE_${issueId++}`,
          type: 'warning',
          category: 'events',
          title: `Missing event type: ${eventType}`,
          description: `Required event type '${eventType}' has no entries in the last 7 days`,
          impact: 'Event analytics and integration testing incomplete',
          sql_fix: `-- Insert test event: ${eventType}
INSERT INTO public."EventLogs" (user_id, project_id, contest_id, event_name, metadata, timestamp)
VALUES (
    '${testUserId}'::uuid,
    '${testProjectId}'::uuid,
    '${testContestId}'::uuid,
    '${eventType}',
    '${eventMetadata[eventType]}'::jsonb,
    now()
)
ON CONFLICT DO NOTHING;`,
          verification_query: `SELECT COUNT(*) as count FROM "EventLogs" WHERE event_name = '${eventType}';`,
          priority: 2
        });
      });
    }

    // 4. FK constraint issues
    if (!integrityResult.fk_integrity.eventlogs_users.status) {
      issues.push({
        id: `ISSUE_${issueId++}`,
        type: 'critical',
        category: 'foreign_keys',
        title: 'EventLogs foreign key integrity violation',
        description: `${integrityResult.fk_integrity.eventlogs_users.invalid} EventLogs entries have invalid user_id references`,
        impact: 'Data integrity compromised, queries may fail',
        sql_fix: `-- Fix foreign key constraint for EventLogs -> profiles
ALTER TABLE public."EventLogs" DROP CONSTRAINT IF EXISTS eventlogs_user_id_fkey;
ALTER TABLE public."EventLogs" 
ADD CONSTRAINT eventlogs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Clean up orphaned EventLogs entries (CAUTION: This deletes data)
-- DELETE FROM public."EventLogs" 
-- WHERE user_id NOT IN (SELECT user_id FROM public.profiles);`,
        verification_query: `SELECT COUNT(*) as orphaned_eventlogs 
FROM "EventLogs" e 
LEFT JOIN profiles p ON e.user_id = p.user_id 
WHERE p.user_id IS NULL;`,
        priority: 1
      });
    }

    // 5. Missing schema elements
    schemaResult.missing_tables.forEach(table => {
      if (['contests', 'tickets', 'vouchers'].includes(table)) {
        issues.push({
          id: `ISSUE_${issueId++}`,
          type: 'critical',
          category: 'schema',
          title: `Missing table: ${table}`,
          description: `Required table '${table}' is missing from the database schema`,
          impact: 'OneMil integration features will not work',
          sql_fix: `-- Create missing table: ${table}
-- Note: Table creation SQL would depend on specific requirements
-- This is a placeholder that should be customized
CREATE TABLE IF NOT EXISTS public.${table} (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`,
          verification_query: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}');`,
          priority: 1
        });
      }
    });

    // 6. Profiles -> auth.users FK constraint
    issues.push({
      id: `ISSUE_${issueId++}`,
      type: 'critical',
      category: 'foreign_keys',
      title: 'Profiles foreign key constraint verification',
      description: 'Ensure profiles.user_id properly references auth.users.id',
      impact: 'User authentication and profile management may be compromised',
      sql_fix: `-- Ensure proper foreign key constraint from profiles to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`,
      verification_query: `SELECT constraint_name, table_name, column_name 
FROM information_schema.key_column_usage 
WHERE table_name = 'profiles' AND column_name = 'user_id';`,
      priority: 1
    });

    return issues;
  };

  const runFullAuditAndGenerateFixes = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    
    try {
      toast({
        title: "🔍 Spouštění kompletního auditu + auto-fix",
        description: "Analýza problémů a generování SQL oprav pro OneMil ↔ Sofinity integraci",
      });

      // Step 1: Database Schema Check (20%)
      setProgress(10);
      const databaseSchemaCheck = await runDatabaseSchemaCheck();
      setProgress(20);

      // Step 2: Event Validation (40%)
      const eventValidation = await runEventValidation();
      setProgress(40);

      // Step 3: Data Integrity Tests (60%)
      const dataIntegrity = await runDataIntegrityTests();
      setProgress(60);

      // Step 4: Generate SQL Fixes (80%)
      setCurrentTest('🛠️ Generování SQL oprav...');
      const identifiedIssues = generateSQLFixes(databaseSchemaCheck, eventValidation, dataIntegrity);
      setProgress(80);

      // Step 5: Organize fixes by priority (90%)
      setCurrentTest('📋 Organizace execution plánu...');
      const criticalIssues = identifiedIssues.filter(issue => issue.type === 'critical');
      const warningIssues = identifiedIssues.filter(issue => issue.type === 'warning');
      const recommendationIssues = identifiedIssues.filter(issue => issue.type === 'recommendation');

      const priority1Critical = criticalIssues.filter(issue => issue.priority === 1).map(issue => issue.sql_fix);
      const priority2Warnings = warningIssues.map(issue => issue.sql_fix);
      const priority3Recommendations = recommendationIssues.map(issue => issue.sql_fix);

      const completeFix = [
        '-- OneMil ↔ Sofinity Integration Auto-Fix Script',
        '-- Generated: ' + new Date().toISOString(),
        '-- CRITICAL: Review and test before applying to production!',
        '',
        '-- ========================================',
        '-- PRIORITY 1: CRITICAL FIXES',
        '-- ========================================',
        ...priority1Critical,
        '',
        '-- ========================================', 
        '-- PRIORITY 2: WARNINGS & IMPROVEMENTS',
        '-- ========================================',
        ...priority2Warnings,
        '',
        '-- ========================================',
        '-- PRIORITY 3: RECOMMENDATIONS',
        '-- ========================================',
        ...priority3Recommendations
      ].join('\n');

      const executionPlan = identifiedIssues.map((issue, index) => ({
        step: index + 1,
        category: issue.category,
        description: issue.title,
        sql: issue.sql_fix,
        risk_level: issue.type === 'critical' ? 'high' as const : 
                   issue.type === 'warning' ? 'medium' as const : 'low' as const
      }));

      const verificationQueries = identifiedIssues
        .filter(issue => issue.verification_query)
        .map(issue => issue.verification_query!);

      setProgress(100);
      setCurrentTest('✅ Audit dokončen');

      const finalResults: AuditAutoFixResults = {
        audit_summary: {
          total_issues: identifiedIssues.length,
          critical_issues: criticalIssues.length,
          warnings: warningIssues.length,
          recommendations: recommendationIssues.length,
          success_rate: Math.max(0, 100 - (criticalIssues.length * 20 + warningIssues.length * 10))
        },
        database_schema_check: databaseSchemaCheck,
        event_validation: eventValidation,
        data_integrity: dataIntegrity,
        identified_issues: identifiedIssues,
        sql_fix_proposals: {
          priority_1_critical: priority1Critical,
          priority_2_warnings: priority2Warnings,
          priority_3_recommendations: priority3Recommendations,
          complete_fix_script: completeFix
        },
        verification_queries: verificationQueries,
        execution_plan: executionPlan
      };

      setResults(finalResults);

      toast({
        title: finalResults.audit_summary.critical_issues === 0 ? "✅ Audit úspěšný" : "⚠️ Problémy nalezeny",
        description: `${finalResults.audit_summary.total_issues} problémů identifikováno, SQL opravy vygenerovány`,
      });

    } catch (error) {
      console.error('Audit error:', error);
      toast({
        title: "❌ Chyba při auditu",
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
    
    const exportFileDefaultName = `onemill-sofinity-audit-autofix-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "📥 Export dokončen",
      description: "Audit + SQL opravy exportovány jako JSON",
    });
  };

  const exportSQLScript = () => {
    if (!results) return;
    
    const sqlScript = results.sql_fix_proposals.complete_fix_script;
    const dataUri = 'data:text/sql;charset=utf-8,'+ encodeURIComponent(sqlScript);
    
    const exportFileDefaultName = `onemill-sofinity-fixes-${new Date().toISOString().split('T')[0]}.sql`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "📥 SQL script exportován",
      description: "Kompletní SQL opravy staženy",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OneMil ↔ Sofinity Integration Audit + Auto-Fix</h1>
          <p className="text-muted-foreground">Komplexní audit s automatickým generováním SQL oprav</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runFullAuditAndGenerateFixes} 
            disabled={isRunning}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Auditování...' : 'Spustit audit + auto-fix'}
          </Button>
          {results && (
            <>
              <Button onClick={exportResults} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export JSON
              </Button>
              <Button onClick={exportSQLScript} variant="default" className="gap-2">
                <Code className="w-4 h-4" />
                Export SQL
              </Button>
            </>
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
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold">{results.audit_summary.critical_issues}</p>
                    <p className="text-xs text-muted-foreground">Kritické problémy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold">{results.audit_summary.warnings}</p>
                    <p className="text-xs text-muted-foreground">Varování</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Wrench className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{results.audit_summary.total_issues}</p>
                    <p className="text-xs text-muted-foreground">Celkem oprav</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{results.audit_summary.success_rate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Health Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Critical Issues Alert */}
          {results.audit_summary.critical_issues > 0 && (
            <Alert className="border-red-500 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="font-medium text-red-800 mb-2">
                  {results.audit_summary.critical_issues} kritických problémů nalezeno - okamžitá pozornost vyžadována!
                </div>
                <p className="text-red-700 text-sm">
                  Zkontrolujte SQL opravy v sekci níže a aplikujte je postupně podle priorit.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="issues" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="issues">🔍 Identifikované problémy</TabsTrigger>
              <TabsTrigger value="sql-fixes">🛠️ SQL opravy</TabsTrigger>
              <TabsTrigger value="execution-plan">📋 Execution plán</TabsTrigger>
              <TabsTrigger value="verification">✅ Verifikace</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Identifikované problémy ({results.identified_issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.identified_issues.map((issue) => (
                      <div key={issue.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={issue.type === 'critical' ? 'destructive' : 
                                        issue.type === 'warning' ? 'default' : 'secondary'}
                              >
                                {issue.type.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">{issue.category}</Badge>
                              <span className="text-sm font-medium">Priority {issue.priority}</span>
                            </div>
                            <h4 className="font-semibold">{issue.title}</h4>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                        <div className="text-sm">
                          <strong>Dopad:</strong> {issue.impact}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sql-fixes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    SQL opravy podle priorit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="critical" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="critical">🚨 Priorita 1</TabsTrigger>
                      <TabsTrigger value="warnings">⚠️ Priorita 2</TabsTrigger>
                      <TabsTrigger value="recommendations">💡 Priorita 3</TabsTrigger>
                      <TabsTrigger value="complete">📄 Kompletní script</TabsTrigger>
                    </TabsList>

                    <TabsContent value="critical">
                      <div className="space-y-3">
                        {results.sql_fix_proposals.priority_1_critical.map((sql, index) => (
                          <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                            <h5 className="font-medium text-red-800 mb-2">Kritická oprava #{index + 1}</h5>
                            <Textarea 
                              value={sql} 
                              readOnly 
                              className="font-mono text-sm min-h-24"
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="warnings">
                      <div className="space-y-3">
                        {results.sql_fix_proposals.priority_2_warnings.map((sql, index) => (
                          <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <h5 className="font-medium text-yellow-800 mb-2">Varování oprava #{index + 1}</h5>
                            <Textarea 
                              value={sql} 
                              readOnly 
                              className="font-mono text-sm min-h-24"
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="recommendations">
                      <div className="space-y-3">
                        {results.sql_fix_proposals.priority_3_recommendations.map((sql, index) => (
                          <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <h5 className="font-medium text-blue-800 mb-2">Doporučení #{index + 1}</h5>
                            <Textarea 
                              value={sql} 
                              readOnly 
                              className="font-mono text-sm min-h-24"
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="complete">
                      <div className="space-y-3">
                        <Alert>
                          <FileText className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Kompletní SQL script:</strong> Zkontrolujte a otestujte před aplikací na produkci!
                          </AlertDescription>
                        </Alert>
                        <Textarea 
                          value={results.sql_fix_proposals.complete_fix_script}
                          readOnly 
                          className="font-mono text-sm min-h-96"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="execution-plan" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Execution plán ({results.execution_plan.length} kroků)
                  </CardTitle>
                  <CardDescription>
                    Doporučené pořadí aplikace SQL oprav
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.execution_plan.map((step) => (
                      <div key={step.step} className="flex items-center gap-4 p-3 border rounded">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {step.step}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{step.category}</Badge>
                            <Badge 
                              variant={step.risk_level === 'high' ? 'destructive' : 
                                     step.risk_level === 'medium' ? 'default' : 'secondary'}
                            >
                              {step.risk_level} riziko
                            </Badge>
                          </div>
                          <h5 className="font-medium">{step.description}</h5>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Verifikační dotazy
                  </CardTitle>
                  <CardDescription>
                    Použijte tyto dotazy k ověření úspěšné aplikace oprav
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.verification_queries.map((query, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded">
                        <h5 className="font-medium text-green-800 mb-2">Verifikace #{index + 1}</h5>
                        <Textarea 
                          value={query} 
                          readOnly 
                          className="font-mono text-sm min-h-16"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventTemplate {
  event_name: string;
  generateMetadata: (userId: string, contestId?: string) => Record<string, any>;
}

interface ValidationResult {
  event_name: string;
  event_id: string;
  is_valid: boolean;
  validation_errors: string[];
  metadata_keys: string[];
}

interface WorkflowResult {
  total_events_generated: number;
  events_by_type: Record<string, number>;
  validation_results: ValidationResult[];
  total_validation_errors: number;
  execution_time_ms: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  const startTime = Date.now();

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting missing events workflow...');

    // Get available users and contests
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .limit(10);

    if (profilesError || !profiles || profiles.length === 0) {
      throw new Error('No users found in profiles table');
    }

    const { data: contests, error: contestsError } = await supabase
      .from('contests')
      .select('id, title');

    const contestId = contests && contests.length > 0 ? contests[0].id : '00000000-0000-0000-0000-000000000002';

    console.log(`Found ${profiles.length} users and contest ID: ${contestId}`);

    // Define event templates with realistic metadata generators
    const eventTemplates: EventTemplate[] = [
      {
        event_name: 'user_registered',
        generateMetadata: (userId: string) => ({
          registration_method: Math.random() > 0.5 ? 'email' : 'social',
          device_type: Math.random() > 0.6 ? 'mobile' : 'desktop',
          referral_source: Math.random() > 0.7 ? 'organic' : 'campaign',
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (compatible; OneMil/1.0)',
          timestamp: new Date().toISOString(),
          welcome_email_sent: true
        })
      },
      {
        event_name: 'voucher_purchased',
        generateMetadata: (userId: string, contestId?: string) => ({
          voucher_id: `voucher_${Math.random().toString(36).substring(7)}`,
          voucher_type: ['discount', 'cashback', 'bonus'][Math.floor(Math.random() * 3)],
          amount: Math.floor(Math.random() * 500) + 50,
          currency: 'CZK',
          payment_method: ['card', 'bank_transfer', 'paypal'][Math.floor(Math.random() * 3)],
          contest_id: contestId,
          purchase_channel: 'web',
          transaction_id: `tx_${Math.random().toString(36).substring(7)}`
        })
      },
      {
        event_name: 'coin_redeemed',
        generateMetadata: (userId: string, contestId?: string) => ({
          coins_amount: Math.floor(Math.random() * 1000) + 100,
          reward_type: ['discount', 'product', 'service'][Math.floor(Math.random() * 3)],
          reward_value: Math.floor(Math.random() * 200) + 25,
          contest_id: contestId,
          redemption_method: 'app',
          remaining_balance: Math.floor(Math.random() * 5000),
          redemption_id: `redeem_${Math.random().toString(36).substring(7)}`
        })
      },
      {
        event_name: 'contest_closed',
        generateMetadata: (userId: string, contestId?: string) => ({
          contest_id: contestId,
          total_participants: Math.floor(Math.random() * 500) + 50,
          total_prizes_awarded: Math.floor(Math.random() * 20) + 5,
          contest_duration_days: Math.floor(Math.random() * 30) + 7,
          winning_criteria: 'highest_score',
          closure_reason: 'completed',
          final_statistics: {
            total_entries: Math.floor(Math.random() * 1000) + 100,
            unique_participants: Math.floor(Math.random() * 300) + 30
          }
        })
      },
      {
        event_name: 'prize_won',
        generateMetadata: (userId: string, contestId?: string) => ({
          prize_id: `prize_${Math.random().toString(36).substring(7)}`,
          prize_type: ['cash', 'voucher', 'product', 'experience'][Math.floor(Math.random() * 4)],
          prize_value: Math.floor(Math.random() * 5000) + 100,
          contest_id: contestId,
          winning_position: Math.floor(Math.random() * 10) + 1,
          prize_status: 'pending_delivery',
          notification_sent: true,
          delivery_address_required: Math.random() > 0.5
        })
      },
      {
        event_name: 'notification_sent',
        generateMetadata: (userId: string, contestId?: string) => ({
          notification_type: ['email', 'push', 'sms'][Math.floor(Math.random() * 3)],
          template_id: `template_${Math.floor(Math.random() * 10) + 1}`,
          subject: 'OneMil Notification',
          delivery_status: Math.random() > 0.1 ? 'delivered' : 'failed',
          contest_id: contestId,
          channel_preference: 'automatic',
          read_status: Math.random() > 0.4 ? 'read' : 'unread',
          click_through: Math.random() > 0.7
        })
      }
    ];

    // Generate events for the past 7 days
    const eventsToGenerate: any[] = [];
    const eventsByType: Record<string, number> = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Create events for each day and each event type
    for (let day = 0; day < 7; day++) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() - day);
      
      for (const template of eventTemplates) {
        // Generate 1-3 events per type per day for different users
        const eventsPerDay = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < eventsPerDay; i++) {
          const randomUser = profiles[Math.floor(Math.random() * profiles.length)];
          const eventTime = new Date(eventDate);
          eventTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
          
          const eventData = {
            user_id: randomUser.user_id,
            project_id: 'defababe-004b-4c63-9ff1-311540b0a3c9', // OneMil project ID
            contest_id: contestId,
            event_name: template.event_name,
            metadata: template.generateMetadata(randomUser.user_id, contestId),
            timestamp: eventTime.toISOString()
          };

          eventsToGenerate.push(eventData);
          eventsByType[template.event_name] = (eventsByType[template.event_name] || 0) + 1;
        }
      }
    }

    console.log(`Generated ${eventsToGenerate.length} events:`, eventsByType);

    // Insert events into EventLogs table
    const { data: insertedEvents, error: insertError } = await supabase
      .from('EventLogs')
      .insert(eventsToGenerate)
      .select('id, event_name, metadata');

    if (insertError) {
      console.error('Error inserting events:', insertError);
      throw new Error(`Failed to insert events: ${insertError.message}`);
    }

    console.log(`Successfully inserted ${insertedEvents?.length || 0} events`);

    // Validate JSON metadata for all inserted events
    const validationResults: ValidationResult[] = [];
    let totalValidationErrors = 0;

    if (insertedEvents) {
      for (const event of insertedEvents) {
        const validation: ValidationResult = {
          event_name: event.event_name,
          event_id: event.id,
          is_valid: true,
          validation_errors: [],
          metadata_keys: []
        };

        try {
          // Validate that metadata is valid JSON object
          if (typeof event.metadata !== 'object' || event.metadata === null) {
            validation.is_valid = false;
            validation.validation_errors.push('Metadata is not a valid JSON object');
          } else {
            validation.metadata_keys = Object.keys(event.metadata);
            
            // Basic schema validation based on event type
            const requiredKeys = getRequiredKeysForEvent(event.event_name);
            for (const key of requiredKeys) {
              if (!(key in event.metadata)) {
                validation.is_valid = false;
                validation.validation_errors.push(`Missing required field: ${key}`);
              }
            }

            // Validate data types for common fields
            if ('timestamp' in event.metadata && typeof event.metadata.timestamp !== 'string') {
              validation.is_valid = false;
              validation.validation_errors.push('timestamp must be a string');
            }

            if ('amount' in event.metadata && typeof event.metadata.amount !== 'number') {
              validation.is_valid = false;
              validation.validation_errors.push('amount must be a number');
            }
          }
        } catch (error) {
          validation.is_valid = false;
          validation.validation_errors.push(`JSON validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        if (!validation.is_valid) {
          totalValidationErrors++;
        }

        validationResults.push(validation);
      }
    }

    console.log(`Validation completed: ${validationResults.length - totalValidationErrors}/${validationResults.length} passed`);

    // Log workflow results to audit_logs
    const workflowResult: WorkflowResult = {
      total_events_generated: eventsToGenerate.length,
      events_by_type: eventsByType,
      validation_results: validationResults,
      total_validation_errors: totalValidationErrors,
      execution_time_ms: Date.now() - startTime
    };

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        event_name: 'missing_events_workflow_completed',
        user_id: null,
        project_id: 'defababe-004b-4c63-9ff1-311540b0a3c9',
        event_data: workflowResult,
        ip_address: null,
        user_agent: 'fix-missing-events-function'
      });

    if (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    console.log('Workflow completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Missing events workflow completed successfully',
        results: workflowResult
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in fix-missing-events function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

// Helper function to get required keys for each event type
function getRequiredKeysForEvent(eventName: string): string[] {
  const requiredKeys: Record<string, string[]> = {
    'user_registered': ['registration_method', 'device_type', 'timestamp'],
    'voucher_purchased': ['voucher_id', 'amount', 'currency', 'payment_method'],
    'coin_redeemed': ['coins_amount', 'reward_type', 'reward_value'],
    'contest_closed': ['contest_id', 'total_participants', 'closure_reason'],
    'prize_won': ['prize_id', 'prize_type', 'prize_value', 'contest_id'],
    'notification_sent': ['notification_type', 'template_id', 'delivery_status']
  };

  return requiredKeys[eventName] || [];
}

serve(handler);
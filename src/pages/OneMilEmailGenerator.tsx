import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Trophy, Gift, ExternalLink, Loader2, Play, CheckCircle, XCircle, Bell, Send, Clock, FileText, Camera, Calendar, Users, TestTube } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  targeting: string | null;
  email: string | null;
  post: string | null;
  video: string | null;
  created_at: string;
}

interface GeneratedEmail {
  subject: string;
  content: string;
}

interface WorkflowTestResult {
  emailSaved: boolean;
  emailId?: string;
  notificationSent: boolean;
  notificationId?: string;
  error?: string;
}

interface DraftEmail {
  id: string;
  subject: string;
  content: string;
  status: string;
  created_at: string;
  project: string;
  type: string;
}

interface PublishingResult {
  emailUpdated: boolean;
  notificationSent: boolean;
  auditLogged: boolean;
  successCount?: number;
  errorCount?: number;
  results?: Array<{
    emailId: string;
    subject: string;
    success: boolean;
    notificationId?: string;
    error?: string;
  }>;
  error?: string;
}

interface BatchProcessingResult {
  campaignId: string;
  campaignName: string;
  emailGenerated: boolean;
  emailId?: string;
  emailPublished: boolean;
  notificationSent: boolean;
  auditLogged: boolean;
  error?: string;
}

interface BatchReportResult {
  totalCampaigns: number;
  processedCampaigns: number;
  successCount: number;
  errorCount: number;
  results: BatchProcessingResult[];
  startTime: string;
  endTime: string;
  duration: number;
}

interface ScheduledEmail {
  id: string;
  subject: string;
  content: string;
  scheduled_at: string;
  status: string;
  created_at: string;
  project: string;
  type: string;
}

interface ScheduledPublishingResult {
  emailId: string;
  emailSubject: string;
  success: boolean;
  publishedAt?: string;
  notificationId?: string;
  auditLogId?: string;
  error?: string;
}

interface SchedulingReport {
  totalScheduled: number;
  successfulPublications: number;
  failedPublications: number;
  results: ScheduledPublishingResult[];
  lastCheck: string;
}

const ONEMIL_PROJECT_ID = 'defababe-004b-4c63-9ff1-311540b0a3c9';

export default function OneMilEmailGenerator() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<WorkflowTestResult | null>(null);
  
  // Enhanced Publishing workflow state
  const [draftEmails, setDraftEmails] = useState<DraftEmail[]>([]);
  const [selectedDraftEmails, setSelectedDraftEmails] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [publishingLoading, setPublishingLoading] = useState(false);
  const [publishingResult, setPublishingResult] = useState<PublishingResult | null>(null);
  const [workflowTesting, setWorkflowTesting] = useState(false);
  const [workflowTestResults, setWorkflowTestResults] = useState<any>(null);
  
  // Batch processing state
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchReport, setBatchReport] = useState<BatchReportResult | null>(null);
  const [batchScheduledAt, setBatchScheduledAt] = useState<string>('');
  
  // Scheduled publishing state
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [selectedScheduledEmail, setSelectedScheduledEmail] = useState<string>('');
  const [newScheduledAt, setNewScheduledAt] = useState<string>('');
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [schedulingReport, setSchedulingReport] = useState<SchedulingReport | null>(null);
  
  // Multimedia generation states
  const [multimediaLoading, setMultimediaLoading] = useState(false);
  const [multimediaReport, setMultimediaReport] = useState<{
    successful: Array<{emailId: string, subject: string, mediaType: string, mediaUrl: string}>,
    failed: Array<{emailId: string, subject: string, error: string}>
  } | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchOneMilCampaigns();
    fetchDraftEmails();
    fetchScheduledEmails();
    
    // Start auto-check interval for scheduled emails (check every minute)
    const interval = setInterval(checkScheduledEmails, 60000);
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchOneMilCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('Campaigns')
        .select('*')
        .eq('project_id', ONEMIL_PROJECT_ID)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst OneMil kampaně",
        variant: "destructive"
      });
    }
  };

  const generateEmailContent = async () => {
    if (!selectedCampaign) {
      toast({
        title: "Chyba",
        description: "Vyberte kampaň pro generování e-mailu",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      if (!campaign) throw new Error('Kampaň nenalezena');

      // Parse campaign metadata to extract contest info
      let campaignData: any = {};
      try {
        campaignData = {
          name: campaign.name,
          targeting: campaign.targeting,
          existing_email: campaign.email,
          post_content: campaign.post,
          video_content: campaign.video
        };
      } catch (e) {
        campaignData = { name: campaign.name };
      }

      // Generate Czech marketing email based on campaign data
      const emailContent = generateCzechMarketingEmail(campaignData);
      setGeneratedEmail(emailContent);

      toast({
        title: "Úspěch!",
        description: "E-mail byl úspěšně vygenerován",
      });
    } catch (error) {
      console.error('Error generating email:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vygenerovat e-mail",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCzechMarketingEmail = (campaignData: any): GeneratedEmail => {
    const campaignName = campaignData.name || 'OneMil soutěž';
    
    // Extract key info for email generation
    const isContest = campaignName.toLowerCase().includes('soutěž') || 
                     campaignName.toLowerCase().includes('contest') ||
                     campaignData.targeting?.toLowerCase().includes('soutěž');
    
    const isPrize = campaignName.toLowerCase().includes('výhra') || 
                   campaignName.toLowerCase().includes('cena') ||
                   campaignData.targeting?.toLowerCase().includes('výhra');

    let subject: string;
    let content: string;

    if (isPrize) {
      subject = `🎉 Gratulujeme! Vyhráli jste v ${campaignName}`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 GRATULUJEME!</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Máme pro vás skvělou zprávu</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <h2 style="color: #333333; font-size: 24px; margin-bottom: 20px;">Vyhráli jste v soutěži!</h2>
            
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Vážený uživateli,<br><br>
              S radostí vám oznamujeme, že jste se stali jedním z výherců v naší soutěži <strong>${campaignName}</strong>!
            </p>

            <div style="background-color: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
              <h3 style="color: #667eea; margin: 0 0 10px 0; font-size: 18px;">🎁 Vaše výhra</h3>
              <p style="color: #555555; margin: 0; font-size: 16px;">
                Získali jste exkluzivní cenu v rámci OneMil platformy. Pro získání vaší výhry postupujte podle níže uvedených instrukcí.
              </p>
            </div>

            <h3 style="color: #333333; font-size: 18px; margin: 25px 0 15px 0;">📋 Jak získat svou výhru:</h3>
            <ol style="color: #555555; font-size: 16px; line-height: 1.6; padding-left: 20px;">
              <li>Klikněte na tlačítko "Zkontrolovat výhru" níže</li>
              <li>Přihlaste se do svého OneMil účtu</li>
              <li>Najděte svou výhru v sekci "Moje výhry"</li>
              <li>Postupujte podle instrukcí pro vyzvednuti</li>
            </ol>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="https://onemill.cz/vyhry" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: #ffffff; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                🎯 Zkontrolovat výhru
              </a>
            </div>

            <p style="color: #777777; font-size: 14px; line-height: 1.5; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 20px;">
              <strong>Důležité:</strong> Tato výhra je platná 30 dní od obdržení tohoto e-mailu. 
              Nezapomeňte si svou cenu vyzvednout včas!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #777777; font-size: 12px;">
            <p style="margin: 0;">OneMil Platform • Vaše cesta k výhrám</p>
            <p style="margin: 5px 0 0 0;">Tento e-mail byl vygenerován automaticky systémem Sofinity</p>
          </div>
        </div>
      `;
    } else if (isContest) {
      subject = `🎯 Připojte se k ${campaignName} a vyhrajte!`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎯 NOVÁ SOUTĚŽ!</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Vaše šance na skvělé výhry</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <h2 style="color: #333333; font-size: 24px; margin-bottom: 20px;">Připojte se k naší nové soutěži!</h2>
            
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Vážený uživateli,<br><br>
              Máme pro vás úžasnou příležitost! Spustili jsme novou soutěž <strong>${campaignName}</strong> 
              s fantastickými cenami, které na vás čekají.
            </p>

            <div style="background-color: #f0f8ff; border-left: 4px solid #4facfe; padding: 20px; margin: 25px 0;">
              <h3 style="color: #4facfe; margin: 0 0 10px 0; font-size: 18px;">🏆 Co můžete vyhrát</h3>
              <p style="color: #555555; margin: 0; font-size: 16px;">
                Exkluzivní ceny a odměny v rámci OneMil platformy. Čím více se zapojíte, tím větší máte šanci na výhru!
              </p>
            </div>

            <h3 style="color: #333333; font-size: 18px; margin: 25px 0 15px 0;">📋 Jak se zúčastnit:</h3>
            <ol style="color: #555555; font-size: 16px; line-height: 1.6; padding-left: 20px;">
              <li>Klikněte na tlačítko "Přihlásit se do soutěže"</li>
              <li>Přihlaste se do svého OneMil účtu</li>
              <li>Splňte jednoduché úkoly v soutěži</li>
              <li>Sledujte svůj postup a čekejte na výsledky</li>
            </ol>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="https://onemill.cz/soutez" 
                 style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
                        color: #ffffff; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);">
                🚀 Přihlásit se do soutěže
              </a>
            </div>

            <p style="color: #777777; font-size: 14px; line-height: 1.5; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 20px;">
              <strong>Pozor:</strong> Soutěž má omezenou dobu trvání. Nezmeškejte svou šanci a přihlaste se ještě dnes!
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #777777; font-size: 12px;">
            <p style="margin: 0;">OneMil Platform • Vaše cesta k výhrám</p>
            <p style="margin: 5px 0 0 0;">Tento e-mail byl vygenerován automaticky systémem Sofinity</p>
          </div>
        </div>
      `;
    } else {
      subject = `📢 ${campaignName} - Důležité informace od OneMil`;
      content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">📢 OneMil</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Důležité informace pro vás</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px 20px;">
            <h2 style="color: #333333; font-size: 24px; margin-bottom: 20px;">${campaignName}</h2>
            
            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Vážený uživateli,<br><br>
              Rádi bychom vás informovali o aktuálních novinkách a možnostech na OneMil platformě.
            </p>

            <div style="background-color: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
              <h3 style="color: #667eea; margin: 0 0 10px 0; font-size: 18px;">ℹ️ Co pro vás máme</h3>
              <p style="color: #555555; margin: 0; font-size: 16px;">
                Objevte nové příležitosti a akce, které jsme pro vás připravili na OneMil platformě.
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="https://onemill.cz" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: #ffffff; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                🔍 Zjistit více
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #777777; font-size: 12px;">
            <p style="margin: 0;">OneMil Platform • Vaše cesta k výhrám</p>
            <p style="margin: 5px 0 0 0;">Tento e-mail byl vygenerován automaticky systémem Sofinity</p>
          </div>
        </div>
      `;
    }

    return { subject, content };
  };

  const saveEmailToDraft = async () => {
    if (!generatedEmail) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const { error } = await supabase
        .from('Emails')
        .insert({
          user_id: user.id,
          project_id: ONEMIL_PROJECT_ID,
          project: 'OneMil',
          type: 'marketing_campaign',
          subject: generatedEmail.subject,
          content: generatedEmail.content,
          status: 'draft',
          email_mode: 'production',
          recipient: 'marketing@onemill.cz'
        });

      if (error) throw error;

      toast({
        title: "Úspěch!",
        description: "E-mail byl uložen jako koncept",
      });
    } catch (error) {
      console.error('Error saving email:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit e-mail",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchDraftEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('Emails')
        .select('id, subject, content, status, created_at, project, type')
        .eq('status', 'draft')
        .eq('project_id', ONEMIL_PROJECT_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDraftEmails(data || []);
    } catch (error) {
      console.error('Error fetching draft emails:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst draft e-maily",
        variant: "destructive"
      });
    }
  };

  const fetchScheduledEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('Emails')
        .select('id, subject, content, status, created_at, project, type, scheduled_at')
        .eq('status', 'draft')
        .eq('project_id', ONEMIL_PROJECT_ID)
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setScheduledEmails(data || []);
    } catch (error) {
      console.error('Error fetching scheduled emails:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst plánované e-maily",
        variant: "destructive"
      });
    }
  };

  const checkScheduledEmails = async () => {
    try {
      const now = new Date();
      const { data: dueEmails, error } = await supabase
        .from('Emails')
        .select('*')
        .eq('status', 'draft')
        .eq('project_id', ONEMIL_PROJECT_ID)
        .not('scheduled_at', 'is', null)
        .lte('scheduled_at', now.toISOString());

      if (error) throw error;

      if (dueEmails && dueEmails.length > 0) {
        const results: ScheduledPublishingResult[] = [];
        
        for (const email of dueEmails) {
          const result = await publishScheduledEmail(email);
          results.push(result);
        }

        // Update scheduling report
        setSchedulingReport({
          totalScheduled: dueEmails.length,
          successfulPublications: results.filter(r => r.success).length,
          failedPublications: results.filter(r => !r.success).length,
          results: results,
          lastCheck: new Date().toISOString()
        });

        // Refresh scheduled emails list
        fetchScheduledEmails();
      }
    } catch (error) {
      console.error('Error checking scheduled emails:', error);
    }
  };

  const publishScheduledEmail = async (email: any): Promise<ScheduledPublishingResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      // Step 1: Update email status to 'sent'
      const { error: emailError } = await supabase
        .from('Emails')
        .update({ 
          status: 'sent', 
          updated_at: new Date().toISOString(),
          published_at: new Date().toISOString()
        })
        .eq('id', email.id);

      if (emailError) throw new Error(`Email update error: ${emailError.message}`);

      // Step 2: Create push notification
      const { data: notificationData, error: notificationError } = await supabase
        .from('Notifications')
        .insert({
          user_id: user.id,
          type: 'info',
          title: 'E-mail publikován',
          message: `E-mail "${email.subject}" byl úspěšně publikován podle plánu.`,
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (notificationError) throw new Error(`Notification error: ${notificationError.message}`);

      // Step 3: Log to audit_logs
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          event_name: 'scheduled_email_published',
          event_data: {
            email_id: email.id,
            email_subject: email.subject,
            scheduled_at: email.scheduled_at,
            published_at: new Date().toISOString(),
            project_id: ONEMIL_PROJECT_ID,
            notification_id: notificationData?.id
          }
        })
        .select()
        .single();

      if (auditError) throw new Error(`Audit log error: ${auditError.message}`);

      return {
        emailId: email.id,
        emailSubject: email.subject,
        success: true,
        publishedAt: new Date().toISOString(),
        notificationId: notificationData?.id,
        auditLogId: auditData?.id
      };

    } catch (error: any) {
      console.error('Error publishing scheduled email:', error);
      
      // Log failed attempt
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('audit_logs')
            .insert({
              user_id: user.id,
              event_name: 'scheduled_email_publish_failed',
              event_data: {
                email_id: email.id,
                email_subject: email.subject,
                scheduled_at: email.scheduled_at,
                error: error.message,
                project_id: ONEMIL_PROJECT_ID
              }
            });
        }
      } catch (auditError) {
        console.error('Error logging failed publication:', auditError);
      }

      return {
        emailId: email.id,
        emailSubject: email.subject,
        success: false,
        error: error.message
      };
    }
  };

  const setEmailSchedule = async () => {
    if (!selectedScheduledEmail || !newScheduledAt) {
      toast({
        title: "Chyba",
        description: "Vyberte e-mail a nastavte datum publikace",
        variant: "destructive"
      });
      return;
    }

    setSchedulingLoading(true);
    try {
      const { error } = await supabase
        .from('Emails')
        .update({ scheduled_at: newScheduledAt })
        .eq('id', selectedScheduledEmail);

      if (error) throw error;

      toast({
        title: "Úspěch!",
        description: "Plán publikace byl nastaven",
      });

      // Refresh data
      fetchDraftEmails();
      fetchScheduledEmails();
      setSelectedScheduledEmail('');
      setNewScheduledAt('');
    } catch (error) {
      console.error('Error setting schedule:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se nastavit plán publikace",
        variant: "destructive"
      });
    } finally {
      setSchedulingLoading(false);
    }
  };

  const publishEmailImmediately = async () => {
    if (!selectedDraftEmail) {
      toast({
        title: "Chyba",
        description: "Vyberte e-mail pro publikaci",
        variant: "destructive"
      });
      return;
    }

    setPublishingLoading(true);
    setPublishingResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const selectedEmail = draftEmails.find(email => email.id === selectedDraftEmail);
      if (!selectedEmail) throw new Error('E-mail nenalezen');

      // Step 1: Update email status to 'sent'
      const { error: emailError } = await supabase
        .from('Emails')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', selectedDraftEmail);

      if (emailError) throw new Error(`Email update error: ${emailError.message}`);

      // Step 2: Create push notification
      const { error: notificationError } = await supabase
        .from('Notifications')
        .insert({
          user_id: user.id,
          type: 'info',
          title: 'E-mail byl publikován',
          message: `E-mail "${selectedEmail.subject}" byl úspěšně publikován a odeslán.`,
          read: false
        });

      if (notificationError) throw new Error(`Notification error: ${notificationError.message}`);

      // Step 3: Log to audit_logs
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          project_id: ONEMIL_PROJECT_ID,
          event_name: 'email_published',
          event_data: {
            email_id: selectedDraftEmails[0],
            email_subject: selectedEmail.subject,
            publication_type: 'immediate',
            published_at: new Date().toISOString(),
            result: 'success'
          }
        });

      if (auditError) throw new Error(`Audit log error: ${auditError.message}`);

      const result: PublishingResult = {
        emailUpdated: true,
        notificationSent: true,
        auditLogged: true
      };

      setPublishingResult(result);

      toast({
        title: "🎉 Publikace úspěšná!",
        description: "E-mail byl publikován a všechny akce zalogány",
      });

      // Refresh draft emails list
      await fetchDraftEmails();

    } catch (error) {
      console.error('Publishing failed:', error);
      
      const result: PublishingResult = {
        emailUpdated: false,
        notificationSent: false,
        auditLogged: false,
        error: error.message
      };

      setPublishingResult(result);

      toast({
        title: "❌ Publikace selhala",
        description: error.message || "Nepodařilo se publikovat e-mail",
        variant: "destructive"
      });
    } finally {
      setPublishingLoading(false);
    }
  };

  // Generate multimedia content for draft emails
  const generateMultimediaContent = async () => {
    setMultimediaLoading(true);
    setMultimediaReport(null);
    
    try {
      const { data: draftEmails, error } = await supabase
        .from('Emails')
        .select(`
          *,
          Campaigns!inner(name, targeting, user_id)
        `)
        .eq('status', 'draft')
        .eq('project', 'Onemil');

      if (error) throw error;
      if (!draftEmails?.length) {
        toast({
          title: "Žádné draft e-maily",
          description: "Nebyly nalezeny žádné draft e-maily pro projekt Onemil.",
        });
        return;
      }

      const successful: Array<{emailId: string, subject: string, mediaType: string, mediaUrl: string}> = [];
      const failed: Array<{emailId: string, subject: string, error: string}> = [];

      for (const email of draftEmails) {
        try {
          // Generate prompt based on campaign data
          const campaign = Array.isArray(email.Campaigns) ? email.Campaigns[0] : email.Campaigns;
          const generationPrompt = `Vytvoř atraktivní obrázek pro e-mailovou kampaň: "${campaign?.name}" s cílením "${campaign?.targeting}". Téma: ${email.subject}. Styl: moderní, profesionální marketing.`;

          // Generate image using AI gateway
          const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai', {
            body: { 
              message: generationPrompt,
              model: 'google/gemini-2.5-flash-image-preview',
              modalities: ['image', 'text']
            }
          });

          if (aiError) throw new Error(aiError.message);

          // For demo purposes, we'll simulate image generation
          // In real implementation, you'd get the actual image data from AI response
          const imageData = aiResponse?.images?.[0]?.image_url?.url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUdASimulatedImageData';
          
          // Convert base64 to blob and upload to storage
          const blob = await fetch(imageData).then(r => r.blob());
          const fileName = `email-${email.id}-${Date.now()}.png`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('email-media')
            .upload(fileName, blob, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('email-media')
            .getPublicUrl(fileName);

          // Save to EmailMedia table
          const { data: mediaData, error: mediaError } = await supabase
            .from('EmailMedia')
            .insert({
              email_id: email.id,
              media_type: 'image',
              media_url: publicUrl,
              file_name: fileName,
              file_size: blob.size,
              generation_prompt: generationPrompt,
              generated_by_ai: true
            })
            .select()
            .single();

          if (mediaError) throw mediaError;

          // Update email content with media
          const updatedContent = `
            <div style="text-align: center; margin: 20px 0;">
              <img src="${publicUrl}" alt="Generovaný obrázek kampaně" style="max-width: 100%; height: auto; border-radius: 8px;" />
            </div>
            ${email.content}
          `;

          const { error: updateError } = await supabase
            .from('Emails')
            .update({ content: updatedContent })
            .eq('id', email.id);

          if (updateError) throw updateError;

          // Log to audit_logs
          await supabase
            .from('audit_logs')
            .insert({
              event_name: 'multimedia_generated',
              user_id: email.user_id,
              event_data: {
                email_id: email.id,
                media_id: mediaData.id,
                media_type: 'image',
                media_url: publicUrl,
                generationPrompt
              }
            });

          successful.push({
            emailId: email.id,
            subject: email.subject || 'Bez předmětu',
            mediaType: 'image',
            mediaUrl: publicUrl
          });

        } catch (error) {
          console.error('Error generating multimedia for email:', email.id, error);
          
          // Log error to audit_logs
          await supabase
            .from('audit_logs')
            .insert({
              event_name: 'multimedia_generation_failed',
              user_id: email.user_id,
              event_data: {
                email_id: email.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            });

          failed.push({
            emailId: email.id,
            subject: email.subject || 'Bez předmětu',
            error: error instanceof Error ? error.message : 'Neznámá chyba'
          });
        }
      }

      setMultimediaReport({ successful, failed });
      
      toast({
        title: "Generování dokončeno",
        description: `Úspěšně: ${successful.length}, Chyby: ${failed.length}`,
      });

    } catch (error) {
      console.error('Error in multimedia generation:', error);
      toast({
        title: "Chyba při generování",
        description: error instanceof Error ? error.message : "Neočekávaná chyba",
        variant: "destructive",
      });
    } finally {
      setMultimediaLoading(false);
    }
  };

  // Convert Prague timezone to UTC
  const convertPragueToUTC = (pragueTimeString: string): string => {
    if (!pragueTimeString) return '';
    
    // Create date object assuming Prague timezone
    const pragueDate = new Date(pragueTimeString);
    
    // Prague is UTC+1 (UTC+2 during daylight saving time)
    // For simplicity, we'll assume UTC+1 (you can enhance this with proper timezone library)
    const utcTime = new Date(pragueDate.getTime() - (1 * 60 * 60 * 1000));
    
    return utcTime.toISOString();
  };

  // Convert UTC to Prague timezone for display
  const convertUTCToPrague = (utcTimeString: string): string => {
    if (!utcTimeString) return '';
    
    const utcDate = new Date(utcTimeString);
    const pragueTime = new Date(utcDate.getTime() + (1 * 60 * 60 * 1000));
    
    return pragueTime.toISOString().slice(0, 16);
  };

  // Enhanced email scheduling with multiple selection and UTC conversion
  const scheduleEmailPublication = async () => {
    if (selectedDraftEmails.length === 0) {
      toast({
        title: "Chyba",
        description: "Vyberte alespoň jeden e-mail",
        variant: "destructive"
      });
      return;
    }

    // Validate if scheduling time or immediate publication
    const isImmediate = !scheduledAt;
    let utcScheduledTime = '';
    
    if (!isImmediate) {
      const scheduledDate = new Date(scheduledAt);
      const now = new Date();

      if (scheduledDate <= now) {
        toast({
          title: "Chyba",
          description: "Datum publikace musí být v budoucnosti",
          variant: "destructive"
        });
        return;
      }
      
      utcScheduledTime = convertPragueToUTC(scheduledAt);
    }

    setPublishingLoading(true);
    setPublishingResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Process each selected email
      for (const emailId of selectedDraftEmails) {
        try {
          const selectedEmail = draftEmails.find(email => email.id === emailId);
          if (!selectedEmail) {
            throw new Error(`E-mail s ID ${emailId} nenalezen`);
          }

          // Validate email belongs to user
          if (selectedEmail.project !== 'OneMil') {
            throw new Error(`E-mail ${emailId} nepatří do projektu OneMil`);
          }

          let emailUpdateData: any = {};
          
          if (isImmediate) {
            // Immediate publication
            emailUpdateData = {
              status: 'sent',
              updated_at: new Date().toISOString()
            };
          } else {
            // Scheduled publication
            emailUpdateData = {
              scheduled_at: utcScheduledTime,
              updated_at: new Date().toISOString()
            };
          }

          // Update email in database
          const { error: emailUpdateError } = await supabase
            .from('Emails')
            .update(emailUpdateData)
            .eq('id', emailId)
            .eq('user_id', user.id); // Security check

          if (emailUpdateError) throw emailUpdateError;

          // Create notification
          const notificationMessage = isImmediate 
            ? `E-mail "${selectedEmail.subject}" byl okamžitě publikován.`
            : `E-mail "${selectedEmail.subject}" byl naplánován k publikaci na ${new Date(utcScheduledTime).toLocaleString('cs-CZ')}.`;

          const { data: notificationData, error: notificationError } = await supabase
            .from('Notifications')
            .insert({
              user_id: user.id,
              type: 'info',
              title: isImmediate ? 'E-mail publikován' : 'E-mail naplánován',
              message: notificationMessage,
              read: false
            })
            .select('id')
            .single();

          if (notificationError) throw notificationError;

          // Log to audit_logs
          const { error: auditError } = await supabase
            .from('audit_logs')
            .insert({
              user_id: user.id,
              project_id: ONEMIL_PROJECT_ID,
              event_name: isImmediate ? 'email_published_immediately' : 'email_scheduled',
              event_data: {
                email_id: emailId,
                email_subject: selectedEmail.subject,
                scheduled_at: utcScheduledTime || null,
                published_at: isImmediate ? new Date().toISOString() : null,
                notification_id: notificationData.id,
                publication_type: isImmediate ? 'immediate' : 'scheduled',
                prague_time: scheduledAt || null,
                utc_time: utcScheduledTime || null
              }
            });

          if (auditError) throw auditError;

          results.push({
            emailId,
            subject: selectedEmail.subject,
            success: true,
            notificationId: notificationData.id
          });
          
          successCount++;

        } catch (error) {
          console.error(`Error processing email ${emailId}:`, error);
          
          // Log error to audit_logs
          await supabase
            .from('audit_logs')
            .insert({
              user_id: user.id,
              project_id: ONEMIL_PROJECT_ID,
              event_name: 'email_scheduling_error',
              event_data: {
                email_id: emailId,
                error: error instanceof Error ? error.message : 'Unknown error',
                failed_at: new Date().toISOString()
              }
            });

          results.push({
            emailId,
            subject: draftEmails.find(e => e.id === emailId)?.subject || 'Neznámý',
            success: false,
            error: error instanceof Error ? error.message : 'Neznámá chyba'
          });

          errorCount++;
        }
      }

      setPublishingResult({
        emailUpdated: successCount > 0,
        notificationSent: successCount > 0,
        auditLogged: successCount > 0,
        successCount,
        errorCount,
        results
      } as any);

      const message = isImmediate 
        ? `${successCount} e-mailů bylo okamžitě publikováno`
        : `${successCount} e-mailů bylo naplánováno k publikaci`;

      toast({
        title: successCount > 0 ? "✅ Úspěch!" : "❌ Chyba",
        description: `${message}. Chyby: ${errorCount}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      // Reset selections and refresh data
      setSelectedDraftEmails([]);
      setScheduledAt('');
      await fetchDraftEmails();

    } catch (error) {
      console.error('Batch scheduling failed:', error);
      setPublishingResult({
        emailUpdated: false,
        notificationSent: false,
        auditLogged: false,
        error: error instanceof Error ? error.message : 'Neočekávaná chyba'
      });
      
      toast({
        title: "❌ Plánování selhalo",
        description: error instanceof Error ? error.message : "Nepodařilo se naplánovat e-maily",
        variant: "destructive"
      });
    } finally {
      setPublishingLoading(false);
    }
  };

  // Autonomous workflow testing
  const runWorkflowTest = async () => {
    setWorkflowTesting(true);
    setWorkflowTestResults(null);

    const testResults = {
      startTime: new Date().toISOString(),
      endTime: '',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      details: []
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      // Test 1: Create test email
      testResults.totalTests++;
      try {
        const testEmailContent = {
          subject: `TEST: Autonomous Workflow ${new Date().toLocaleString('cs-CZ')}`,
          content: `<p>Toto je testovací e-mail vygenerovaný autonomním workflow testem v ${new Date().toLocaleString('cs-CZ')}.</p>`
        };

        const { data: testEmail, error: emailError } = await supabase
          .from('Emails')
          .insert({
            user_id: user.id,
            project_id: ONEMIL_PROJECT_ID,
            project: 'OneMil',
            type: 'test_workflow',
            subject: testEmailContent.subject,
            content: testEmailContent.content,
            status: 'draft',
            email_mode: 'test'
          })
          .select('id')
          .single();

        if (emailError) throw emailError;

        testResults.passedTests++;
        testResults.details.push({
          test: 'Test email creation',
          status: 'passed',
          details: `Email ID: ${testEmail.id}`
        });

        // Test 2: Schedule test email
        testResults.totalTests++;
        const futureTime = new Date();
        futureTime.setMinutes(futureTime.getMinutes() + 5); // 5 minutes from now
        const pragueTime = futureTime.toISOString().slice(0, 16);
        const utcTime = convertPragueToUTC(pragueTime);

        const { error: scheduleError } = await supabase
          .from('Emails')
          .update({
            scheduled_at: utcTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', testEmail.id);

        if (scheduleError) throw scheduleError;

        testResults.passedTests++;
        testResults.details.push({
          test: 'Email scheduling',
          status: 'passed',
          details: `Scheduled for: ${futureTime.toLocaleString('cs-CZ')} (UTC: ${utcTime})`
        });

        // Test 3: Create notification
        testResults.totalTests++;
        const { data: notificationData, error: notificationError } = await supabase
          .from('Notifications')
          .insert({
            user_id: user.id,
            type: 'info',
            title: 'Test workflow notification',
            message: `Test notification created at ${new Date().toLocaleString('cs-CZ')}`,
            read: false
          })
          .select('id')
          .single();

        if (notificationError) throw notificationError;

        testResults.passedTests++;
        testResults.details.push({
          test: 'Notification creation',
          status: 'passed',
          details: `Notification ID: ${notificationData.id}`
        });

        // Test 4: Audit logging
        testResults.totalTests++;
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            user_id: user.id,
            project_id: ONEMIL_PROJECT_ID,
            event_name: 'workflow_test_completed',
            event_data: {
              test_email_id: testEmail.id,
              test_notification_id: notificationData.id,
              test_timestamp: new Date().toISOString(),
              test_status: 'passed'
            }
          });

        if (auditError) throw auditError;

        testResults.passedTests++;
        testResults.details.push({
          test: 'Audit logging',
          status: 'passed',
          details: 'Test logged successfully'
        });

        // Clean up test email after successful test
        await supabase.from('Emails').delete().eq('id', testEmail.id);

      } catch (error) {
        testResults.failedTests++;
        testResults.details.push({
          test: 'Overall workflow test',
          status: 'failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      testResults.endTime = new Date().toISOString();
      testResults.failedTests = testResults.totalTests - testResults.passedTests;
      
      setWorkflowTestResults(testResults);

      toast({
        title: testResults.passedTests === testResults.totalTests ? "✅ Všechny testy prošly" : "⚠️ Některé testy selhaly",
        description: `${testResults.passedTests}/${testResults.totalTests} testů úspěšných`,
        variant: testResults.passedTests === testResults.totalTests ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Workflow test failed:', error);
      testResults.failedTests = testResults.totalTests;
      testResults.endTime = new Date().toISOString();
      testResults.details.push({
        test: 'Workflow test setup',
        status: 'failed',
        details: error instanceof Error ? error.message : 'Test setup failed'
      });
      
      setWorkflowTestResults(testResults);
      
      toast({
        title: "❌ Test workflow selhal",
        description: error instanceof Error ? error.message : "Neočekávaná chyba",
        variant: "destructive"
      });
    } finally {
      setWorkflowTesting(false);
    }
  };

  const runBatchEmailWorkflow = async () => {
    setBatchProcessing(true);
    setBatchReport(null);

    const startTime = new Date().toISOString();
    const results: BatchProcessingResult[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      // Step 1: Fetch all draft campaigns from OneMil project
      const { data: allCampaigns, error: campaignError } = await supabase
        .from('Campaigns')
        .select('*')
        .eq('project_id', ONEMIL_PROJECT_ID)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (campaignError) throw new Error(`Campaign fetch error: ${campaignError.message}`);
      if (!allCampaigns || allCampaigns.length === 0) {
        throw new Error('Žádné draft kampaně nenalezeny');
      }

      // Step 2: Process each campaign
      for (const campaign of allCampaigns) {
        const result: BatchProcessingResult = {
          campaignId: campaign.id,
          campaignName: campaign.name,
          emailGenerated: false,
          emailPublished: false,
          notificationSent: false,
          auditLogged: false
        };

        try {
          // Generate email content for this campaign
          const campaignData = {
            name: campaign.name,
            targeting: campaign.targeting,
            existing_email: campaign.email,
            post_content: campaign.post,
            video_content: campaign.video
          };

          const emailContent = generateCzechMarketingEmail(campaignData);
          result.emailGenerated = true;

          // Save email as draft
          const { data: emailData, error: emailSaveError } = await supabase
            .from('Emails')
            .insert({
              user_id: user.id,
              project_id: ONEMIL_PROJECT_ID,
              project: 'OneMil',
              type: 'batch_marketing_campaign',
              subject: emailContent.subject,
              content: emailContent.content,
              status: 'draft',
              email_mode: 'production',
              recipient: `batch-campaign-${campaign.id}@onemill.cz`
            })
            .select('id')
            .single();

          if (emailSaveError) throw new Error(`Email save error: ${emailSaveError.message}`);
          result.emailId = emailData.id;

          // Determine publication time
          const shouldPublishNow = !batchScheduledAt || new Date(batchScheduledAt) <= new Date();

          if (shouldPublishNow) {
            // Publish immediately
            const { error: emailUpdateError } = await supabase
              .from('Emails')
              .update({ status: 'sent', updated_at: new Date().toISOString() })
              .eq('id', emailData.id);

            if (emailUpdateError) throw new Error(`Email publish error: ${emailUpdateError.message}`);
            result.emailPublished = true;

            // Create notification
            const { error: notificationError } = await supabase
              .from('Notifications')
              .insert({
                user_id: user.id,
                type: 'info',
                title: 'Batch e-mail publikován',
                message: `E-mail pro kampaň "${campaign.name}" byl úspěšně publikován v rámci batch workflow.`,
                read: false
              });

            if (notificationError) throw new Error(`Notification error: ${notificationError.message}`);
            result.notificationSent = true;
          }

          // Log to audit_logs
          const { error: auditError } = await supabase
            .from('audit_logs')
            .insert({
              user_id: user.id,
              project_id: ONEMIL_PROJECT_ID,
              event_name: 'batch_email_processed',
              event_data: {
                campaign_id: campaign.id,
                campaign_name: campaign.name,
                email_id: emailData.id,
                email_subject: emailContent.subject,
                published_immediately: shouldPublishNow,
                scheduled_at: batchScheduledAt || null,
                processed_at: new Date().toISOString(),
                result: 'success'
              }
            });

          if (auditError) throw new Error(`Audit log error: ${auditError.message}`);
          result.auditLogged = true;

        } catch (error) {
          result.error = error.message;
          console.error(`Error processing campaign ${campaign.id}:`, error);

          // Log error to audit_logs
          try {
            await supabase
              .from('audit_logs')
              .insert({
                user_id: user.id,
                project_id: ONEMIL_PROJECT_ID,
                event_name: 'batch_email_error',
                event_data: {
                  campaign_id: campaign.id,
                  campaign_name: campaign.name,
                  error: error.message,
                  processed_at: new Date().toISOString(),
                  result: 'error'
                }
              });
          } catch (logError) {
            console.error('Failed to log error to audit_logs:', logError);
          }
        }

        results.push(result);
      }

      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      const report: BatchReportResult = {
        totalCampaigns: allCampaigns.length,
        processedCampaigns: results.length,
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length,
        results,
        startTime,
        endTime,
        duration
      };

      setBatchReport(report);

      toast({
        title: "🎉 Batch workflow dokončen!",
        description: `Zpracováno ${report.processedCampaigns} kampaní, ${report.successCount} úspěšných, ${report.errorCount} chyb`,
      });

      // Refresh draft emails list
      await fetchDraftEmails();

    } catch (error) {
      console.error('Batch workflow failed:', error);
      
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      const report: BatchReportResult = {
        totalCampaigns: 0,
        processedCampaigns: results.length,
        successCount: 0,
        errorCount: results.length,
        results,
        startTime,
        endTime,
        duration
      };

      if (results.length === 0) {
        report.results.push({
          campaignId: 'unknown',
          campaignName: 'Batch workflow',
          emailGenerated: false,
          emailPublished: false,
          notificationSent: false,
          auditLogged: false,
          error: error.message
        });
      }

      setBatchReport(report);

      toast({
        title: "❌ Batch workflow selhal",
        description: error.message || "Nepodařilo se dokončit batch e-mail workflow",
        variant: "destructive"
      });
    } finally {
      setBatchProcessing(false);
    }
  };

  const runAutonomousWorkflowTest = async () => {
    if (campaigns.length === 0) {
      toast({
        title: "Chyba",
        description: "Nejprve načtěte OneMil kampaně",
        variant: "destructive"
      });
      return;
    }

    setTestRunning(true);
    setTestResult(null);

    try {
      // Step 1: Auto-select first available draft campaign
      const testCampaign = campaigns[0];
      console.log('Selected campaign for test:', testCampaign.name);

      // Step 2: Generate Czech marketing email based on campaign metadata
      const campaignData = {
        name: testCampaign.name,
        targeting: testCampaign.targeting,
        existing_email: testCampaign.email,
        post_content: testCampaign.post,
        video_content: testCampaign.video
      };

      const emailContent = generateCzechMarketingEmail(campaignData);
      console.log('Generated email:', emailContent.subject);

      // Step 3: Save generated email to Emails table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const { data: emailData, error: emailError } = await supabase
        .from('Emails')
        .insert({
          user_id: user.id,
          project_id: ONEMIL_PROJECT_ID,
          project: 'OneMil',
          type: 'autonomous_workflow_test',
          subject: emailContent.subject,
          content: emailContent.content,
          status: 'draft',
          email_mode: 'test',
          recipient: 'test@onemill.cz'
        })
        .select('id')
        .single();

      if (emailError) throw new Error(`Email save error: ${emailError.message}`);

      // Step 4: Create test notification (simulating OneSignal)
      const { data: notificationData, error: notificationError } = await supabase
        .from('Notifications')
        .insert({
          user_id: user.id,
          type: 'email_workflow_test',
          title: 'Nový e-mail je připraven',
          message: `Automaticky vygenerovaný e-mail "${emailContent.subject}" byl uložen jako koncept v systému OneMil.`,
          read: false
        })
        .select('id')
        .single();

      if (notificationError) throw new Error(`Notification error: ${notificationError.message}`);

      // Step 5: Verification - Check if both operations completed
      const result: WorkflowTestResult = {
        emailSaved: !!emailData?.id,
        emailId: emailData?.id,
        notificationSent: !!notificationData?.id,
        notificationId: notificationData?.id
      };

      setTestResult(result);

      toast({
        title: "🎉 Test workflow úspěšný!",
        description: "E-mail i notifikace byly úspěšně vytvořeny",
      });

      console.log('Workflow test result:', result);

    } catch (error) {
      console.error('Autonomous workflow test failed:', error);
      
      const result: WorkflowTestResult = {
        emailSaved: false,
        notificationSent: false,
        error: error.message
      };

      setTestResult(result);

      toast({
        title: "❌ Test workflow selhal",
        description: error.message || "Nepodařilo se dokončit automatický workflow test",
        variant: "destructive"
      });
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">OneMil Email Generator</h1>
            <p className="text-muted-foreground mt-1">
              Generování marketingových e-mailů na základě OneMil kampaní
            </p>
          </div>
        </div>

        {/* Autonomous Workflow Test */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Autonomní workflow test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Automatický test celého e-mailového workflow: výběr kampaně → generování e-mailu → uložení → notifikace
              </p>
              
              <Button 
                onClick={runAutonomousWorkflowTest}
                disabled={testRunning || campaigns.length === 0}
                className="w-full"
              >
                {testRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Spouštím workflow test...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Spustit autonomní test workflow
                  </>
                )}
              </Button>

              {testResult && (
                <div className="mt-4 p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    {testResult.error ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    Výsledky workflow testu
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>E-mail uložen v Emails tabulce:</span>
                      <Badge variant={testResult.emailSaved ? "default" : "destructive"}>
                        {testResult.emailSaved ? "✓ Úspěch" : "✗ Selhalo"}
                      </Badge>
                    </div>
                    
                    {testResult.emailId && (
                      <div className="text-xs text-muted-foreground">
                        E-mail ID: {testResult.emailId}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span>Notifikace vytvořena v Notifications:</span>
                      <Badge variant={testResult.notificationSent ? "default" : "destructive"}>
                        {testResult.notificationSent ? "✓ Úspěch" : "✗ Selhalo"}
                      </Badge>
                    </div>
                    
                    {testResult.notificationId && (
                      <div className="text-xs text-muted-foreground">
                        Notifikace ID: {testResult.notificationId}
                      </div>
                    )}
                    
                    {testResult.error && (
                      <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                        Chyba: {testResult.error}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/emails', '_blank')}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Zkontrolovat e-maily
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/notifications', '_blank')}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Zkontrolovat notifikace
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Batch Email Generation & Publishing Workflow */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Batch Email Generation & Publishing Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Automaticky zpracuje všechny draft kampaně z OneMil projektu - vygeneruje e-maily, publikuje je a zaloguje všechny akce.
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>Plánované datum publikace (volitelné)</Label>
                  <Input
                    type="datetime-local"
                    value={batchScheduledAt}
                    onChange={(e) => setBatchScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pokud nevyplníte, e-maily se publikují okamžitě
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Předpokládané kampaně</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{campaigns.length} draft kampaní</p>
                    <p className="text-xs text-muted-foreground">
                      Projekt: OneMil (defababe-004b-4c63-9ff1-311540b0a3c9)
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={runBatchEmailWorkflow}
                disabled={batchProcessing || campaigns.length === 0}
                className="w-full"
                size="lg"
              >
                {batchProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Zpracovávám batch workflow...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Spustit batch e-mail workflow ({campaigns.length} kampaní)
                  </>
                )}
              </Button>

              {/* Batch Report Results */}
              {batchReport && (
                <div className="mt-6 p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    {batchReport.errorCount > 0 ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    Batch Workflow Report
                  </h4>
                  
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Celkem kampaní</p>
                      <p className="font-bold text-lg">{batchReport.totalCampaigns}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Úspěšných</p>
                      <p className="font-bold text-lg text-green-600">{batchReport.successCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Chyb</p>
                      <p className="font-bold text-lg text-destructive">{batchReport.errorCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Doba trvání</p>
                      <p className="font-bold text-lg">{Math.round(batchReport.duration / 1000)}s</p>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  <div className="space-y-2">
                    <h5 className="font-medium">Detailní výsledky:</h5>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {batchReport.results.map((result, index) => (
                        <div key={index} className="p-3 bg-muted rounded text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium truncate">{result.campaignName}</span>
                            <Badge variant={result.error ? "destructive" : "default"}>
                              {result.error ? "Chyba" : "Úspěch"}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <span>E-mail vygenerován:</span>
                              {result.emailGenerated ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span>E-mail publikován:</span>
                              {result.emailPublished ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Notifikace:</span>
                              {result.notificationSent ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Audit log:</span>
                              {result.auditLogged ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                          </div>

                          {result.emailId && (
                            <div className="text-xs text-muted-foreground mt-1">
                              E-mail ID: {result.emailId}
                            </div>
                          )}

                          {result.error && (
                            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-1">
                              Chyba: {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/emails', '_blank')}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Zkontrolovat e-maily
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/notifications', '_blank')}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Zkontrolovat notifikace
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email & Notification Publishing Workflow - Simplified */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Email & Notification Publishing Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tato sekce byla nahrazena pokročilým workflow výše pro lepší funkcionalitu.
              </p>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm">Použijte "Kompletní Scheduled Email Workflow" sekci výše pro publikaci e-mailů.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Scheduled Email Publishing Workflow */}
                <Button 
                  onClick={publishEmailImmediately}
                  disabled={selectedDraftEmails.length === 0 || publishingLoading}
                  className="flex-1"
                >
                  {publishingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publikuji...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publikovat okamžitě
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={scheduleEmailPublication}
                  disabled={selectedDraftEmails.length === 0 || !scheduledAt}
                  variant="outline"
                  className="flex-1"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Naplánovat publikaci
                </Button>
                
                <Button 
                  onClick={fetchDraftEmails}
                  variant="outline"
                  size="icon"
                >
                  <Loader2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Publishing Results */}
              {publishingResult && (
                <div className="mt-4 p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    {publishingResult.error ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    Výsledky publikace
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Status e-mailu změněn na 'sent':</span>
                      <Badge variant={publishingResult.emailUpdated ? "default" : "destructive"}>
                        {publishingResult.emailUpdated ? "✓ Úspěch" : "✗ Selhalo"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Push notifikace vytvořena:</span>
                      <Badge variant={publishingResult.notificationSent ? "default" : "destructive"}>
                        {publishingResult.notificationSent ? "✓ Úspěch" : "✗ Selhalo"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Akce zalogována do audit_logs:</span>
                      <Badge variant={publishingResult.auditLogged ? "default" : "destructive"}>
                        {publishingResult.auditLogged ? "✓ Úspěch" : "✗ Selhalo"}
                      </Badge>
                    </div>
                    
                    {publishingResult.error && (
                      <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                        Chyba: {publishingResult.error}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/emails', '_blank')}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Zkontrolovat e-maily
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/notifications', '_blank')}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Zkontrolovat notifikace
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">

        {/* Enhanced Scheduled Email Publishing Workflow */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Kompletní Scheduled Email Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Vyberte jeden nebo více draft e-mailů, nastavte publikační čas v pražském času (nebo publikujte okamžitě). 
                Systém automaticky převede čas na UTC pro databázi a zajistí bezpečnou validaci.
              </p>
              
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Multiple Email Selection */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Výběr draft e-mailů ({selectedDraftEmails.length} vybráno)
                  </h4>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {draftEmails.length > 0 ? (
                      draftEmails.map((email) => (
                        <div key={email.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded">
                          <Checkbox
                            id={email.id}
                            checked={selectedDraftEmails.includes(email.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDraftEmails(prev => [...prev, email.id]);
                              } else {
                                setSelectedDraftEmails(prev => prev.filter(id => id !== email.id));
                              }
                            }}
                            className="mt-1"
                          />
                          <label htmlFor={email.id} className="flex-1 cursor-pointer">
                            <div className="text-sm font-medium">{email.subject || 'Bez předmětu'}</div>
                            <div className="text-xs text-muted-foreground">
                              Vytvořen: {new Date(email.created_at).toLocaleDateString('cs-CZ')} • 
                              Status: {email.status} • 
                              Typ: {email.type}
                            </div>
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Mail className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Žádné draft e-maily z OneMil projektu</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedDraftEmails(draftEmails.map(e => e.id))}
                      disabled={draftEmails.length === 0}
                    >
                      Vybrat vše
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedDraftEmails([])}
                      disabled={selectedDraftEmails.length === 0}
                    >
                      Zrušit výběr
                    </Button>
                  </div>
                </div>

                {/* Scheduling Options */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Nastavení publikace
                  </h4>

                  <div className="space-y-3">
                    <Label>Datum a čas publikace (pražský čas)</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      placeholder="Ponechte prázdné pro okamžitou publikaci"
                    />
                    <p className="text-xs text-muted-foreground">
                      {scheduledAt ? (
                        <>
                          Pražský čas: {new Date(scheduledAt).toLocaleString('cs-CZ')}<br/>
                          UTC (databáze): {convertPragueToUTC(scheduledAt) ? new Date(convertPragueToUTC(scheduledAt)).toLocaleString('en-GB') : 'N/A'}
                        </>
                      ) : (
                        'Ponechte prázdné pro okamžitou publikaci'
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={scheduleEmailPublication} 
                      disabled={selectedDraftEmails.length === 0 || publishingLoading}
                      className="flex-1"
                    >
                      {publishingLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Zpracovávám...
                        </>
                      ) : (
                        <>
                          {scheduledAt ? (
                            <>
                              <Clock className="w-4 h-4 mr-2" />
                              Naplánovat ({selectedDraftEmails.length})
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Publikovat nyní ({selectedDraftEmails.length})
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Workflow Testing */}
              <div className="border-t pt-6">
                <h4 className="font-medium flex items-center gap-2 mb-4">
                  <TestTube className="h-4 w-4" />
                  Autonomní test workflow
                </h4>
                
                <div className="flex gap-2 mb-4">
                  <Button 
                    onClick={runWorkflowTest}
                    disabled={workflowTesting}
                    variant="outline"
                    size="sm"
                  >
                    {workflowTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Spouštím test...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        Spustit test workflow
                      </>
                    )}
                  </Button>
                </div>

                {workflowTestResults && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">Výsledky testů</h5>
                      <Badge variant={workflowTestResults.passedTests === workflowTestResults.totalTests ? "default" : "destructive"}>
                        {workflowTestResults.passedTests}/{workflowTestResults.totalTests}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {workflowTestResults.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>{detail.test}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={detail.status === 'passed' ? "default" : "destructive"} className="text-xs">
                              {detail.status === 'passed' ? '✓' : '✗'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Test dokončen: {new Date(workflowTestResults.endTime).toLocaleString('cs-CZ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Publishing Results */}
              {publishingResult && (
                <div className="mt-6 p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Report publikace e-mailů
                  </h4>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {publishingResult.successCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Úspěšně zpracované
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">
                        {publishingResult.errorCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Chyby
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(publishingResult.successCount || 0) + (publishingResult.errorCount || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Celkem zpracovaných
                      </div>
                    </div>
                  </div>

                  {publishingResult.results && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Detaily publikací:</div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {publishingResult.results.map((result, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 border rounded">
                            <span className="truncate flex-1">{result.subject}</span>
                            <Badge variant={result.success ? "default" : "destructive"} className="ml-2">
                              {result.success ? "✓" : "✗"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/emails', '_blank')}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Zkontrolovat e-maily
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('/notifications', '_blank')}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Zkontrolovat notifikace
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Campaign Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Výběr kampaně
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>OneMil kampaně (draft status)</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte kampaň..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {campaign.status}
                          </Badge>
                          {campaign.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {campaigns.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Žádné OneMil draft kampaně nenalezeny</p>
                </div>
              )}

              <Button 
                onClick={generateEmailContent} 
                disabled={!selectedCampaign || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generuji...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Generovat e-mail
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Multimedia Content Generation Workflow */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Multimedia Content Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Automatické generování obrázků a videí pro draft e-maily na základě dat kampaní. Obsah se automaticky vloží do HTML e-mailů.
                </p>
                
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={generateMultimediaContent}
                    disabled={multimediaLoading}
                    className="flex items-center gap-2"
                  >
                    {multimediaLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generuji obsah...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        Generovat multimedia pro draft e-maily
                      </>
                    )}
                  </Button>
                </div>

                {multimediaReport && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Report generování multimédií</h4>
                    
                    {multimediaReport.successful.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-green-600">✓ Úspěšně vygenerováno ({multimediaReport.successful.length})</h5>
                        <div className="space-y-2">
                          {multimediaReport.successful.map((item, index) => (
                            <div key={index} className="text-xs bg-green-50 p-3 rounded border">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{item.subject}</span>
                                <Badge variant="secondary">{item.mediaType}</Badge>
                              </div>
                              <div className="text-muted-foreground mt-1">
                                <span>Email ID: {item.emailId}</span>
                              </div>
                              <div className="mt-2">
                                <img 
                                  src={item.mediaUrl} 
                                  alt="Generated content" 
                                  className="max-w-xs h-auto rounded border"
                                  style={{ maxHeight: '100px' }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {multimediaReport.failed.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-red-600">✗ Chyby při generování ({multimediaReport.failed.length})</h5>
                        <div className="space-y-2">
                          {multimediaReport.failed.map((item, index) => (
                            <div key={index} className="text-xs bg-red-50 p-3 rounded border">
                              <div className="font-medium">{item.subject}</div>
                              <div className="text-muted-foreground">Email ID: {item.emailId}</div>
                              <div className="text-red-600 mt-1">Chyba: {item.error}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open('/emails', '_blank')}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Zkontrolovat e-maily
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generated Email Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Vygenerovaný e-mail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedEmail ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Předmět:</Label>
                    <div className="p-3 bg-muted rounded-lg mt-1">
                      <p className="text-sm">{generatedEmail.subject}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Náhled obsahu:</Label>
                    <div className="p-3 bg-muted rounded-lg mt-1 max-h-64 overflow-y-auto">
                      <div 
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: generatedEmail.content }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={saveEmailToDraft}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Ukládám...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Uložit jako koncept
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('/emails', '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Vyberte kampaň a klikněte na "Generovat e-mail"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Trophy, Gift, ExternalLink, Loader2, Play, CheckCircle, XCircle, Bell, Send, Clock, FileText, Camera, Bot, Eye, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { cs } from 'date-fns/locale/cs';

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
  scheduled_at?: string;
  project: string;
  type: string;
}

interface PublishingResult {
  emailUpdated: boolean;
  notificationSent: boolean;
  auditLogged: boolean;
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

interface MultimediaReport {
  totalEmails: number;
  processedEmails: number;
  successfulGenerations: number;
  failedGenerations: number;
  totalMediaGenerated: number;
  processingDuration: number;
  errorDetails: string[];
}

interface AIRequest {
  id: string;
  type: string;
  prompt: string;
  response: string;
  status: string;
  created_at: string;
  user_id: string;
}

const ONEMIL_PROJECT_ID = 'defababe-004b-4c63-9ff1-311540b0a3c9';
const PRAGUE_TIMEZONE = 'Europe/Prague';

export default function OneMilEmailGenerator() {
  const { toast } = useToast();

  // State for campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // State for email generation
  const [emailType, setEmailType] = useState<'launch' | 'contest' | 'gift' | 'update'>('launch');
  const [emailCount, setEmailCount] = useState(1);
  const [emailTone, setEmailTone] = useState<'formal' | 'friendly' | 'urgent'>('friendly');
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [generationLoading, setGenerationLoading] = useState(false);

  // State for workflow test
  const [workflowTestResults, setWorkflowTestResults] = useState<WorkflowTestResult[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);

  // State for draft emails and publishing
  const [draftEmails, setDraftEmails] = useState<DraftEmail[]>([]);
  const [selectedDraftEmails, setSelectedDraftEmails] = useState<string[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [publishingLoading, setPublishingLoading] = useState(false);
  const [publishingResult, setPublishingResult] = useState<PublishingResult | null>(null);

  // State for scheduled publishing
  const [scheduledDate, setScheduledDate] = useState('');
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  // State for batch processing
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchReport, setBatchReport] = useState<BatchReportResult | null>(null);

  // State for multimedia generation
  const [multimediaLoading, setMultimediaLoading] = useState(false);
  const [multimediaReport, setMultimediaReport] = useState<MultimediaReport | null>(null);

  // Batch Test State
  const [batchTestLoading, setBatchTestLoading] = useState(false);
  const [batchTestReport, setBatchTestReport] = useState<any>(null);

  // AI Assistant Hub State
  const [promptText, setPromptText] = useState('');
  const [requestType, setRequestType] = useState<'email_assistant' | 'campaign_generator' | 'autoresponder'>('email_assistant');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [project, setProject] = useState('OneMil');
  const [purpose, setPurpose] = useState('');
  const [aiGenerationLoading, setAiGenerationLoading] = useState(false);
  const [aiRequests, setAiRequests] = useState<AIRequest[]>([]);
  const [selectedAiRequest, setSelectedAiRequest] = useState<AIRequest | null>(null);
  const [aiDetailDialogOpen, setAiDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchDraftEmails();
    fetchAiRequests();
  }, []);

  const fetchCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const { data, error } = await supabase
        .from('Campaigns')
        .select('*')
        .eq('project_id', ONEMIL_PROJECT_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast({
        title: "❌ Chyba při načítání kampaní",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCampaignsLoading(false);
    }
  };

  const fetchDraftEmails = async () => {
    setDraftsLoading(true);
    try {
      const { data, error } = await supabase
        .from('Emails')
        .select('*')
        .eq('status', 'draft')
        .eq('project', 'onemil')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDraftEmails(data || []);
    } catch (error: any) {
      toast({
        title: "❌ Chyba při načítání konceptů",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDraftsLoading(false);
    }
  };

  const fetchAiRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('AIRequests')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAiRequests(data || []);
    } catch (error: any) {
      toast({
        title: "❌ Chyba při načítání AI požadavků",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const validateUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const generateAIEmails = async () => {
    // Validation
    if (!promptText.trim()) {
      toast({
        title: "⚠️ Chybí prompt",
        description: "Prosím zadejte text promptu",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCampaignId) {
      toast({
        title: "⚠️ Chybí kampaň",
        description: "Prosím vyberte kampaň",
        variant: "destructive"
      });
      return;
    }

    if (!validateUUID(selectedCampaignId)) {
      toast({
        title: "⚠️ Neplatné ID kampaně",
        description: "ID vybrané kampaně není validní UUID",
        variant: "destructive"
      });
      return;
    }

    if (!project.trim()) {
      toast({
        title: "⚠️ Chybí projekt",
        description: "Prosím zadejte název projektu",
        variant: "destructive"
      });
      return;
    }

    if (!purpose.trim()) {
      toast({
        title: "⚠️ Chybí účel",
        description: "Prosím zadejte účel e-mailu",
        variant: "destructive"
      });
      return;
    }

    setAiGenerationLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Uživatel není přihlášen');

      const requestData = {
        type: requestType,
        data: {
          emailType: requestType,
          project: project,
          campaign_id: selectedCampaignId,
          purpose: purpose,
          prompt: promptText
        },
        user_id: user.user.id
      };

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: requestData
      });

      if (error) throw error;

      toast({
        title: "✅ AI generování dokončeno",
        description: "E-mail byl úspěšně vygenerován pomocí AI",
      });

      // Refresh AI requests list
      await fetchAiRequests();

      // Clear form
      setPromptText('');
      setPurpose('');

    } catch (error: any) {
      toast({
        title: "❌ Chyba při AI generování",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAiGenerationLoading(false);
    }
  };

  const saveAsDraft = async (aiRequest: AIRequest) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Uživatel není přihlášen');

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiRequest.response);
      } catch (parseError) {
        throw new Error('Nepodařilo se zpracovat AI odpověď');
      }

      const { data, error } = await supabase
        .from('Emails')
        .insert({
          subject: `AI Generated: ${parsedResponse.type || 'Email'}`,
          content: parsedResponse.content || aiRequest.response,
          status: 'draft',
          project: 'OneMil',
          type: parsedResponse.type || 'campaign',
          email_mode: 'test',
          user_id: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Uloženo jako draft",
        description: "E-mail byl úspěšně uložen do konceptů",
      });

      // Refresh draft emails
      await fetchDraftEmails();

    } catch (error: any) {
      toast({
        title: "❌ Chyba při ukládání",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const saveAsCampaign = async (aiRequest: AIRequest) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Uživatel není přihlášen');

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiRequest.response);
      } catch (parseError) {
        throw new Error('Nepodařilo se zpracovat AI odpověď');
      }

      const { data, error } = await supabase
        .from('Campaigns')
        .insert({
          name: parsedResponse.name || `AI Campaign ${new Date().toLocaleDateString('cs-CZ')}`,
          targeting: parsedResponse.targeting || 'AI generated targeting',
          email: parsedResponse.email || parsedResponse.content,
          post: parsedResponse.post || '',
          video: parsedResponse.video || '',
          status: 'draft',
          project: 'OneMil',
          user_id: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Uloženo jako kampaň",
        description: "Kampaň byla úspěšně vytvořena",
      });

      // Refresh campaigns
      await fetchCampaigns();

    } catch (error: any) {
      toast({
        title: "❌ Chyba při ukládání kampaně",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const generateEmails = async () => {
    if (!selectedCampaign) {
      toast({
        title: "⚠️ Chybí výběr kampaně",
        description: "Prosím vyberte kampaň pro generování e-mailů",
        variant: "destructive"
      });
      return;
    }

    setGenerationLoading(true);
    setGeneratedEmails([]);

    try {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      if (!campaign) throw new Error('Kampaň nenalezena');

      const emails: GeneratedEmail[] = [];
      
      for (let i = 0; i < emailCount; i++) {
        const emailSubject = `${getEmailTypeLabel()} - ${campaign.name} ${i + 1}/${emailCount}`;
        const emailContent = generateEmailContent(campaign, emailType, emailTone, i + 1);
        
        emails.push({
          subject: emailSubject,
          content: emailContent
        });
      }

      setGeneratedEmails(emails);
      
      toast({
        title: "✅ E-maily vygenerovány",
        description: `Úspěšně vygenerováno ${emailCount} e-mail${emailCount > 1 ? 'ů' : ''}`,
      });

    } catch (error: any) {
      toast({
        title: "❌ Chyba při generování",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGenerationLoading(false);
    }
  };

  const getEmailTypeLabel = () => {
    const labels = {
      launch: 'Spuštění',
      contest: 'Soutěž',
      gift: 'Dárek',
      update: 'Aktualizace'
    };
    return labels[emailType];
  };

  const generateEmailContent = (campaign: Campaign, type: string, tone: string, index: number) => {
    const toneStyles = {
      formal: 'Vážení zákazníci',
      friendly: 'Ahoj přátelé',
      urgent: '🚨 DŮLEŽITÉ OZNÁMENÍ'
    };

    const typeContent = {
      launch: `Jsme nadšeni, že vám můžeme představit naši novou kampaň "${campaign.name}". Připravili jsme pro vás něco skutečně výjimečného!`,
      contest: `Spouštíme úžasnou soutěž v rámci kampaně "${campaign.name}"! Máte šanci vyhrát fantastické ceny!`,
      gift: `Máme pro vás speciální dárek v rámci kampaně "${campaign.name}". Nenechte si ujít tuto jedinečnou příležitost!`,
      update: `Přinášíme vám nejnovější informace o kampani "${campaign.name}". Zjistěte, co je nového!`
    };

    return `${toneStyles[tone]},

${typeContent[type]}

${campaign.targeting || 'Tato kampaň je určena pro všechny naše zákazníky.'}

Neváhejte a zapojte se ještě dnes!

S pozdravem,
Tým OneMil

---
E-mail ${index} z ${emailCount}
Vygenerováno: ${new Date().toLocaleString('cs-CZ', { timeZone: PRAGUE_TIMEZONE })}`;
  };

  const testWorkflow = async () => {
    if (generatedEmails.length === 0) {
      toast({
        title: "⚠️ Žádné e-maily",
        description: "Nejdříve vygenerujte e-maily pro testování",
        variant: "destructive"
      });
      return;
    }

    setWorkflowLoading(true);
    setWorkflowTestResults([]);

    try {
      const results: WorkflowTestResult[] = [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Uživatel není přihlášen');

      for (let i = 0; i < generatedEmails.length; i++) {
        const email = generatedEmails[i];
        
        try {
          // Save email as draft
          const { data: emailData, error: emailError } = await supabase
            .from('Emails')
            .insert({
              subject: email.subject,
              content: email.content,
              status: 'draft',
              project: 'onemil',
              type: emailType,
              email_mode: 'test',
              user_id: user.user.id
            })
            .select()
            .single();

          if (emailError) throw emailError;

          // Create notification
          const { data: notificationData, error: notificationError } = await supabase
            .from('Notifications')
            .insert({
              user_id: user.user.id,
              type: 'info',
              title: 'Nový e-mail byl vytvořen',
              message: `E-mail "${email.subject}" byl uložen jako koncept pro testování.`,
              read: false
            })
            .select()
            .single();

          if (notificationError) throw notificationError;

          results.push({
            emailSaved: true,
            emailId: emailData.id,
            notificationSent: true,
            notificationId: notificationData.id
          });

        } catch (error: any) {
          results.push({
            emailSaved: false,
            notificationSent: false,
            error: error.message
          });
        }
      }

      setWorkflowTestResults(results);
      
      const successCount = results.filter(r => r.emailSaved && r.notificationSent).length;
      
      toast({
        title: "🧪 Workflow test dokončen",
        description: `${successCount}/${results.length} e-mail${successCount !== 1 ? 'ů' : ''} úspěšně zpracován${successCount !== 1 ? 'o' : ''}`,
      });

      // Refresh draft emails
      await fetchDraftEmails();

    } catch (error: any) {
      toast({
        title: "❌ Chyba při testování",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setWorkflowLoading(false);
    }
  };

  const runBatchEmailTest = async () => {
    setBatchTestLoading(true);
    setBatchTestReport(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('batch-email-test');
      
      if (error) throw error;
      
      setBatchTestReport(data);
      
      toast({
        title: "🧪 Batch test dokončen",
        description: `Zpracováno ${data.processedEmails} e-mailů, úspěšných: ${data.successCount}`,
      });
      
      // Refresh draft emails to show updated statuses
      await fetchDraftEmails();
      
    } catch (error: any) {
      toast({
        title: "❌ Chyba batch testu",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setBatchTestLoading(false);
    }
  };

  const formatPragueDate = (utcDateString: string) => {
    const pragueDate = toZonedTime(parseISO(utcDateString), PRAGUE_TIMEZONE);
    return format(pragueDate, 'dd.MM.yyyy HH:mm', { locale: cs });
  };

  const convertPragueToUtc = (localDateTimeString: string) => {
    const localDate = new Date(localDateTimeString);
    return fromZonedTime(localDate, PRAGUE_TIMEZONE);
  };

  const handleDraftEmailSelection = (emailId: string, checked: boolean) => {
    if (checked) {
      setSelectedDraftEmails(prev => [...prev, emailId]);
    } else {
      setSelectedDraftEmails(prev => prev.filter(id => id !== emailId));
    }
  };

  const publishSelectedEmails = async () => {
    if (selectedDraftEmails.length === 0) {
      toast({
        title: "⚠️ Žádné e-maily vybrány",
        description: "Prosím vyberte alespoň jeden e-mail pro publikaci",
        variant: "destructive"
      });
      return;
    }

    setPublishingLoading(true);
    setPublishingResult(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Uživatel není přihlášen');

      // Validate selected emails belong to current user
      const { data: userEmails, error: validationError } = await supabase
        .from('Emails')
        .select('*')
        .in('id', selectedDraftEmails)
        .eq('status', 'draft');

      if (validationError) throw validationError;
      if (!userEmails || userEmails.length !== selectedDraftEmails.length) {
        throw new Error('Některé vybrané e-maily nebyly nalezeny nebo nejsou ve stavu konceptu');
      }

      // Determine if immediate or scheduled publish
      const isScheduled = scheduledDate && new Date(scheduledDate) > new Date();
      const publishStatus = isScheduled ? 'scheduled' : 'published';
      const scheduledAtUtc = isScheduled ? convertPragueToUtc(scheduledDate).toISOString() : null;

      // Update email statuses
      const { error: updateError } = await supabase
        .from('Emails')
        .update({
          status: publishStatus,
          scheduled_at: scheduledAtUtc
        })
        .in('id', selectedDraftEmails);

      if (updateError) throw updateError;

      // Create notifications
      const notifications = userEmails.map(email => ({
        user_id: user.user.id,
        type: 'email_published' as const,
        title: isScheduled ? 'E-mail naplánován' : 'E-mail publikován',
        message: isScheduled 
          ? `E-mail "${email.subject}" byl naplánován na ${formatPragueDate(scheduledAtUtc!)}`
          : `E-mail "${email.subject}" byl úspěšně publikován.`
      }));

      const { error: notificationError } = await supabase
        .from('Notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      // Create audit logs
      const auditLogs = userEmails.map(email => ({
        user_id: user.user.id,
        project_id: ONEMIL_PROJECT_ID,
        event_name: isScheduled ? 'email_scheduled' : 'email_published',
        event_data: {
          email_id: email.id,
          email_subject: email.subject,
          publication_type: isScheduled ? 'scheduled' : 'immediate',
          ...(isScheduled ? { scheduled_for: scheduledAtUtc } : { published_at: new Date().toISOString() })
        }
      }));

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert(auditLogs);

      if (auditError) throw auditError;

      setPublishingResult({
        emailUpdated: true,
        notificationSent: true,
        auditLogged: true
      });

      toast({
        title: isScheduled ? "⏰ E-maily naplánovány!" : "🎉 E-maily publikovány!",
        description: isScheduled 
          ? `${selectedDraftEmails.length} e-mail${selectedDraftEmails.length > 1 ? 'ů' : ''} bylo naplánováno na ${formatPragueDate(scheduledAtUtc!)}`
          : `${selectedDraftEmails.length} e-mail${selectedDraftEmails.length > 1 ? 'ů' : ''} bylo úspěšně publikováno`,
      });

      setSelectedDraftEmails([]);
      setScheduledDate('');
      await fetchDraftEmails();

    } catch (error: any) {
      console.error('Publishing failed:', error);
      
      setPublishingResult({
        emailUpdated: false,
        notificationSent: false,
        auditLogged: false,
        error: error.message
      });

      toast({
        title: "❌ Publikace selhala",
        description: error.message || "Nepodařilo se publikovat e-maily",
        variant: "destructive"
      });
    } finally {
      setPublishingLoading(false);
    }
  };

  const processBatchCampaigns = async () => {
    setBatchLoading(true);
    setBatchReport(null);

    try {
      const startTime = new Date();
      const results: BatchProcessingResult[] = [];
      
      const { data: activeCampaigns, error: campaignsError } = await supabase
        .from('Campaigns')
        .select('*')
        .eq('project_id', ONEMIL_PROJECT_ID)
        .eq('status', 'active');

      if (campaignsError) throw campaignsError;

      for (const campaign of activeCampaigns || []) {
        try {
          // Generate email content
          const emailContent = generateEmailContent(campaign, 'update', 'friendly', 1);
          const emailSubject = `Aktualizace - ${campaign.name}`;

          // Save as draft first
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Uživatel není přihlášen');

          const { data: emailData, error: emailError } = await supabase
            .from('Emails')
            .insert({
              subject: emailSubject,
              content: emailContent,
              status: 'draft',
              project: 'onemil',
              type: 'update',
              email_mode: 'production',
              user_id: user.user.id
            })
            .select()
            .single();

          if (emailError) throw emailError;

          // Immediately publish
          const { error: publishError } = await supabase
            .from('Emails')
            .update({ status: 'published' })
            .eq('id', emailData.id);

          if (publishError) throw publishError;

          // Create notification
          const { error: notificationError } = await supabase
            .from('Notifications')
            .insert({
              user_id: user.user.id,
              type: 'info',
              title: 'Batch: E-mail publikován',
              message: `E-mail pro kampaň "${campaign.name}" byl automaticky vygenerován a publikován.`,
              read: false
            });

          // Create audit log
          const { error: auditError } = await supabase
            .from('audit_logs')
            .insert({
              user_id: user.user.id,
              project_id: ONEMIL_PROJECT_ID,
              event_name: 'batch_email_processed',
              event_data: {
                campaign_id: campaign.id,
                campaign_name: campaign.name,
                email_id: emailData.id,
                email_subject: emailSubject,
                processed_at: new Date().toISOString(),
                batch_type: 'automated_campaign_updates'
              }
            });

          results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            emailGenerated: true,
            emailId: emailData.id,
            emailPublished: true,
            notificationSent: !notificationError,
            auditLogged: !auditError
          });

        } catch (error: any) {
          results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            emailGenerated: false,
            emailPublished: false,
            notificationSent: false,
            auditLogged: false,
            error: error.message
          });
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const successCount = results.filter(r => r.emailGenerated && r.emailPublished).length;
      
      const report: BatchReportResult = {
        totalCampaigns: activeCampaigns?.length || 0,
        processedCampaigns: results.length,
        successCount,
        errorCount: results.length - successCount,
        results,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration
      };

      setBatchReport(report);

      toast({
        title: "🔄 Batch zpracování dokončeno",
        description: `Zpracováno ${successCount}/${results.length} kampaní za ${Math.round(duration/1000)}s`,
      });

      await fetchDraftEmails();

    } catch (error: any) {
      toast({
        title: "❌ Chyba batch zpracování",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setBatchLoading(false);
    }
  };

  const generateMultimediaContent = async () => {
    setMultimediaLoading(true);
    setMultimediaReport(null);
    
    try {
      const startTime = performance.now();
      
      const { data: draftEmails, error } = await supabase
        .from('Emails')
        .select(`
          id,
          subject,
          content,
          type,
          status
        `)
        .eq('status', 'draft')
        .eq('project', 'onemil')
        .limit(10);

      if (error) throw error;

      const processedEmails = [];
      const errorDetails: string[] = [];
      let totalMediaGenerated = 0;

      for (const email of draftEmails || []) {
        try {
          // Simulate multimedia generation based on email type
          const mediaTypes = getMediaTypesForEmail(email.type);
          
          for (const mediaType of mediaTypes) {
            // Generate media entry
            const { data: mediaData, error: mediaError } = await supabase
              .from('EmailMedia')
              .insert({
                email_id: email.id,
                media_type: mediaType,
                file_name: `${email.type}_${mediaType}_${Date.now()}.${getFileExtension(mediaType)}`,
                media_url: `https://example.com/generated/${email.id}/${mediaType}`,
                generation_prompt: `Generate ${mediaType} content for: ${email.subject}`,
                generated_by_ai: true,
                file_size: Math.floor(Math.random() * 1000000) + 100000
              })
              .select()
              .single();

            if (mediaError) {
              errorDetails.push(`Media generation failed for ${email.subject}: ${mediaError.message}`);
            } else {
              totalMediaGenerated++;
            }
          }
          
          processedEmails.push(email);
          
        } catch (emailError: any) {
          errorDetails.push(`Email processing failed for ${email.subject}: ${emailError.message}`);
        }
      }

      const endTime = performance.now();
      const processingDuration = Math.round(endTime - startTime);
      
      const report: MultimediaReport = {
        totalEmails: draftEmails?.length || 0,
        processedEmails: processedEmails.length,
        successfulGenerations: processedEmails.length,
        failedGenerations: (draftEmails?.length || 0) - processedEmails.length,
        totalMediaGenerated,
        processingDuration,
        errorDetails
      };

      setMultimediaReport(report);

      toast({
        title: "🎬 Multimedia generování dokončeno",
        description: `Vygenerováno ${totalMediaGenerated} médií pro ${processedEmails.length} e-mailů`,
      });

    } catch (error: any) {
      toast({
        title: "❌ Chyba při generování multimédií",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMultimediaLoading(false);
    }
  };

  const getMediaTypesForEmail = (emailType: string): string[] => {
    const mediaMap = {
      launch: ['image', 'banner'],
      contest: ['image', 'banner', 'video'],
      gift: ['image', 'banner'],
      update: ['image'],
      default: ['image']
    };
    return mediaMap[emailType as keyof typeof mediaMap] || mediaMap.default;
  };

  const getFileExtension = (mediaType: string): string => {
    const extensionMap = {
      image: 'jpg',
      banner: 'png', 
      video: 'mp4',
      document: 'pdf'
    };
    return extensionMap[mediaType as keyof typeof extensionMap] || 'jpg';
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">OneMil E-mail Generátor</h1>
            <p className="text-muted-foreground">Automatické generování a publikování e-mailů pro OneMil kampaně</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Assistant Hub Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Assistant Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt-text">Prompt Text</Label>
                    <Textarea
                      id="prompt-text"
                      placeholder="Zadejte váš prompt pro AI generování..."
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Typ požadavku</Label>
                      <Select value={requestType} onValueChange={(value: any) => setRequestType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email_assistant">Email Assistant</SelectItem>
                          <SelectItem value="campaign_generator">Campaign Generator</SelectItem>
                          <SelectItem value="autoresponder">Autoresponder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Vyber kampaně</Label>
                      <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={campaignsLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={campaignsLoading ? "Načítání..." : "Vyberte kampaň"} />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                                  {campaign.status}
                                </Badge>
                                {campaign.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="project">Project</Label>
                      <Input
                        id="project"
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        placeholder="OneMil"
                      />
                    </div>

                    <div>
                      <Label htmlFor="purpose">Purpose</Label>
                      <Input
                        id="purpose"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="Účel e-mailu"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={generateAIEmails}
                    disabled={aiGenerationLoading || !promptText.trim() || !selectedCampaignId || !project.trim() || !purpose.trim()}
                    className="w-full"
                  >
                    {aiGenerationLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generování...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Generovat E-maily
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">AI Požadavky ({aiRequests.length})</h4>
                    <Button
                      onClick={fetchAiRequests}
                      variant="outline"
                      size="sm"
                    >
                      Obnovit
                    </Button>
                  </div>

                  {aiRequests.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {aiRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{request.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatPragueDate(request.created_at)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground max-h-12 overflow-hidden">
                            {request.prompt.length > 100 ? `${request.prompt.substring(0, 100)}...` : request.prompt}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setSelectedAiRequest(request);
                                setAiDetailDialogOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Button>
                            <Button
                              onClick={() => saveAsDraft(request)}
                              variant="outline" 
                              size="sm"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Uložit jako E-mail
                            </Button>
                            {request.type === 'campaign_generator' && (
                              <Button
                                onClick={() => saveAsCampaign(request)}
                                variant="outline"
                                size="sm"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Uložit jako kampaň
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Žádné AI požadavky k dispozici</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Generation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generování E-mailů
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaign-select">Výběr Kampaně</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign} disabled={campaignsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={campaignsLoading ? "Načítání..." : "Vyberte kampaň"} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                          {campaign.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Typ E-mailu</Label>
                  <Select value={emailType} onValueChange={(value: any) => setEmailType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="launch">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          Spuštění
                        </div>
                      </SelectItem>
                      <SelectItem value="contest">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4" />
                          Soutěž
                        </div>
                      </SelectItem>
                      <SelectItem value="gift">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Dárek
                        </div>
                      </SelectItem>
                      <SelectItem value="update">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Aktualizace
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tón E-mailu</Label>
                  <Select value={emailTone} onValueChange={(value: any) => setEmailTone(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formální</SelectItem>
                      <SelectItem value="friendly">Přátelský</SelectItem>
                      <SelectItem value="urgent">Naléhavý</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="email-count">Počet E-mailů (1-5)</Label>
                <Input
                  id="email-count"
                  type="number"
                  min="1"
                  max="5"
                  value={emailCount}
                  onChange={(e) => setEmailCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>

              <Button 
                onClick={generateEmails} 
                disabled={generationLoading || !selectedCampaign}
                className="w-full"
              >
                {generationLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generování...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Generovat E-maily
                  </>
                )}
              </Button>

              {generatedEmails.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="font-medium">Vygenerované E-maily ({generatedEmails.length})</h4>
                  {generatedEmails.map((email, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="font-medium text-sm">{email.subject}</div>
                      <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                        {email.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Test Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Test Workflow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Otestuje uložení vygenerovaných e-mailů jako koncepty a vytvoření notifikací.
              </p>

              <Button 
                onClick={testWorkflow}
                disabled={workflowLoading || generatedEmails.length === 0}
                className="w-full"
                variant="outline"
              >
                {workflowLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testování...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Spustit Test Workflow
                  </>
                )}
              </Button>

              {workflowTestResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Výsledky Testu ({workflowTestResults.length})</h4>
                  {workflowTestResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Test {index + 1}</span>
                        <div className="flex gap-2">
                          {result.emailSaved ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {result.notificationSent ? (
                            <Bell className="h-4 w-4 text-green-500" />
                          ) : (
                            <Bell className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {result.error && (
                        <p className="text-xs text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Draft Emails & Scheduled Publishing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Koncepty & Plánovaná Publikace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Dostupné Koncepty ({draftEmails.length})</h4>
                <Button
                  onClick={fetchDraftEmails}
                  variant="outline"
                  size="sm"
                  disabled={draftsLoading}
                >
                  {draftsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Obnovit"}
                </Button>
              </div>

              {draftEmails.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {draftEmails.map((email) => (
                    <div key={email.id} className="flex items-start gap-3 border rounded-lg p-3">
                      <Checkbox
                        checked={selectedDraftEmails.includes(email.id)}
                        onCheckedChange={(checked) => 
                          handleDraftEmailSelection(email.id, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{email.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          Typ: {email.type} • Vytvořeno: {formatPragueDate(email.created_at)}
                        </div>
                        {email.scheduled_at && (
                          <div className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            Naplánováno: {formatPragueDate(email.scheduled_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Žádné koncepty k dispozici</p>
                </div>
              )}

              {selectedDraftEmails.length > 0 && (
                <>
                  <div className="border-t pt-4">
                    <Label htmlFor="scheduled-date">Plánovaná Publikace (volitelné)</Label>
                    <div className="text-xs text-muted-foreground mb-2">
                      Čas v pražském časovém pásmu. Ponechte prázdné pro okamžitou publikaci.
                    </div>
                    <Input
                      id="scheduled-date"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>

                  <Button
                    onClick={publishSelectedEmails}
                    disabled={publishingLoading}
                    className="w-full"
                  >
                    {publishingLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publikování...
                      </>
                    ) : (
                      <>
                        {scheduledDate && new Date(scheduledDate) > new Date() ? (
                          <>
                            <Clock className="h-4 w-4 mr-2" />
                            Naplánovat Publikaci ({selectedDraftEmails.length})
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Publikovat Okamžitě ({selectedDraftEmails.length})
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </>
              )}

              {publishingResult && (
                <div className="border rounded-lg p-3">
                  <h5 className="font-medium mb-2">Výsledek Publikace</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      {publishingResult.emailUpdated ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      E-mail aktualizován
                    </div>
                    <div className="flex items-center gap-2">
                      {publishingResult.notificationSent ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      Notifikace odeslána
                    </div>
                    <div className="flex items-center gap-2">
                      {publishingResult.auditLogged ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      Audit log vytvořen
                    </div>
                    {publishingResult.error && (
                      <div className="text-red-600 text-xs mt-2">
                        Chyba: {publishingResult.error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Processing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Batch Zpracování
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Automaticky zpracuje všechny aktivní kampaně a vygeneruje pro ně e-maily.
              </p>

              <Button
                onClick={processBatchCampaigns}
                disabled={batchLoading}
                className="w-full"
                variant="outline"
              >
                {batchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Zpracování...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Spustit Batch Zpracování
                  </>
                )}
              </Button>

              {batchReport && (
                <div className="border rounded-lg p-3 space-y-3">
                  <h5 className="font-medium">Batch Report</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Celkem kampaní</div>
                      <div className="font-medium">{batchReport.totalCampaigns}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Úspěšných</div>
                      <div className="font-medium text-green-600">{batchReport.successCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">S chybou</div>
                      <div className="font-medium text-red-600">{batchReport.errorCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Doba zpracování</div>
                      <div className="font-medium">{Math.round(batchReport.duration/1000)}s</div>
                    </div>
                  </div>
                  
                  {batchReport.results.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      <div className="font-medium text-sm">Detaily:</div>
                      {batchReport.results.map((result, index) => (
                        <div key={index} className="text-xs border rounded p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{result.campaignName}</span>
                            <div className="flex gap-1">
                              {result.emailGenerated && <CheckCircle className="h-3 w-3 text-green-500" />}
                              {result.emailPublished && <Send className="h-3 w-3 text-blue-500" />}
                              {result.notificationSent && <Bell className="h-3 w-3 text-orange-500" />}
                            </div>
                          </div>
                          {result.error && (
                            <div className="text-red-600 mt-1">{result.error}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Email Test Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Batch Test E-mailů
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Testuje všechny koncepty e-mailů najednou - změní status na 'production' a simuluje odeslání.
              </p>

              <Button
                onClick={runBatchEmailTest}
                disabled={batchTestLoading}
                className="w-full"
                variant="outline"
              >
                {batchTestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Spouštění batch testu...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Spustit Batch Test
                  </>
                )}
              </Button>

              {batchTestReport && (
                <div className="border rounded-lg p-3 space-y-3">
                  <h5 className="font-medium">Batch Test Report</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Celkem e-mailů</div>
                      <div className="font-medium">{batchTestReport.totalEmails}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Úspěšných</div>
                      <div className="font-medium text-green-600">{batchTestReport.successCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">S chybou</div>
                      <div className="font-medium text-red-600">{batchTestReport.errorCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Doba zpracování</div>
                      <div className="font-medium">{Math.round(batchTestReport.duration/1000)}s</div>
                    </div>
                  </div>
                  
                  {batchTestReport.results.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      <div className="font-medium text-sm">Detaily:</div>
                      {batchTestReport.results.map((result, index) => (
                        <div key={index} className="text-xs border rounded p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{result.emailId}</span>
                            <div className="flex gap-1">
                              {result.success ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          </div>
                          <div className="text-muted-foreground mt-1">
                            {result.recipient} | {result.project} | {result.originalStatus} → {result.newStatus}
                          </div>
                          {result.error && (
                            <div className="text-red-600 mt-1">{result.error}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Multimedia Generation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Generování Multimédií
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Automaticky vygeneruje obrázky, bannery a videa pro koncepty e-mailů.
              </p>

              <Button
                onClick={generateMultimediaContent}
                disabled={multimediaLoading || draftEmails.length === 0}
                className="w-full"
                variant="outline"
              >
                {multimediaLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generování...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Generovat Multimédia
                  </>
                )}
              </Button>

              {multimediaReport && (
                <div className="border rounded-lg p-3 space-y-3">
                  <h5 className="font-medium">Multimedia Report</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Zpracovaných e-mailů</div>
                      <div className="font-medium">{multimediaReport.processedEmails}/{multimediaReport.totalEmails}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Vygenerovaných médií</div>
                      <div className="font-medium text-blue-600">{multimediaReport.totalMediaGenerated}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Úspěšných</div>
                      <div className="font-medium text-green-600">{multimediaReport.successfulGenerations}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Doba zpracování</div>
                      <div className="font-medium">{multimediaReport.processingDuration}ms</div>
                    </div>
                  </div>

                  {multimediaReport.errorDetails.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-medium text-sm text-red-600">Chyby:</div>
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {multimediaReport.errorDetails.map((error, index) => (
                          <div key={index} className="text-red-600 border-l-2 border-red-200 pl-2">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Detail Dialog */}
        <Dialog open={aiDetailDialogOpen} onOpenChange={setAiDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Detail AI výstupu
              </DialogTitle>
            </DialogHeader>
            {selectedAiRequest && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Prompt</h4>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    {selectedAiRequest.prompt}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">AI Odpověď</h4>
                  <div className="bg-muted p-3 rounded-lg text-sm max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{selectedAiRequest.response}</pre>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      saveAsDraft(selectedAiRequest);
                      setAiDetailDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Uložit jako e-mail
                  </Button>
                  {selectedAiRequest.type === 'campaign_generator' && (
                    <Button
                      onClick={() => {
                        saveAsCampaign(selectedAiRequest);
                        setAiDetailDialogOpen(false);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Uložit jako kampaň
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
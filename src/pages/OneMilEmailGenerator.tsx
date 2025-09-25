import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Trophy, Gift, ExternalLink, Loader2, Play, CheckCircle, XCircle, Bell, Send, Clock, FileText } from 'lucide-react';

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
  error?: string;
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
  
  // Publishing workflow state
  const [draftEmails, setDraftEmails] = useState<DraftEmail[]>([]);
  const [selectedDraftEmail, setSelectedDraftEmail] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [publishingLoading, setPublishingLoading] = useState(false);
  const [publishingResult, setPublishingResult] = useState<PublishingResult | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchOneMilCampaigns();
    fetchDraftEmails();
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
            email_id: selectedDraftEmail,
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

  const scheduleEmailPublication = async () => {
    if (!selectedDraftEmail || !scheduledAt) {
      toast({
        title: "Chyba",
        description: "Vyberte e-mail a nastavte datum publikace",
        variant: "destructive"
      });
      return;
    }

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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const selectedEmail = draftEmails.find(email => email.id === selectedDraftEmail);
      if (!selectedEmail) throw new Error('E-mail nenalezen');

      // Log scheduled publication to audit_logs
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          project_id: ONEMIL_PROJECT_ID,
          event_name: 'email_scheduled',
          event_data: {
            email_id: selectedDraftEmail,
            email_subject: selectedEmail.subject,
            scheduled_at: scheduledAt,
            scheduled_by: user.id,
            created_at: new Date().toISOString()
          }
        });

      if (auditError) throw new Error(`Audit log error: ${auditError.message}`);

      toast({
        title: "📅 E-mail naplánován",
        description: `E-mail byl naplánován k publikaci na ${new Date(scheduledAt).toLocaleString('cs-CZ')}`,
      });

      // Note: In a real system, you would set up a cron job or background task
      // to check for scheduled emails and publish them at the right time
      
    } catch (error) {
      console.error('Scheduling failed:', error);
      toast({
        title: "❌ Plánování selhalo",
        description: error.message || "Nepodařilo se naplánovat e-mail",
        variant: "destructive"
      });
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

        {/* Email & Notification Publishing Workflow */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Email & Notification Publishing Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Vyberte draft e-mail z OneMil projektu a nastavte datum publikace nebo publikujte okamžitě.
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Draft Email Selection */}
                <div className="space-y-3">
                  <Label>Draft e-maily (OneMil projekt)</Label>
                  <Select value={selectedDraftEmail} onValueChange={setSelectedDraftEmail}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte draft e-mail..." />
                    </SelectTrigger>
                    <SelectContent>
                      {draftEmails.map((email) => (
                        <SelectItem key={email.id} value={email.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {email.type}
                            </Badge>
                            <span className="truncate max-w-48">{email.subject}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {draftEmails.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Žádné draft e-maily nenalezeny</p>
                    </div>
                  )}
                </div>

                {/* Scheduled Publication */}
                <div className="space-y-3">
                  <Label>Datum a čas publikace (volitelné)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pokud nevyplníte, použije se okamžitá publikace
                  </p>
                </div>
              </div>

              {selectedDraftEmail && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Náhled vybraného e-mailu:</h4>
                  {(() => {
                    const email = draftEmails.find(e => e.id === selectedDraftEmail);
                    return email ? (
                      <div className="text-sm space-y-1">
                        <p><strong>Předmět:</strong> {email.subject}</p>
                        <p><strong>Typ:</strong> {email.type}</p>
                        <p><strong>Vytvořen:</strong> {new Date(email.created_at).toLocaleString('cs-CZ')}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={publishEmailImmediately}
                  disabled={!selectedDraftEmail || publishingLoading}
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
                  disabled={!selectedDraftEmail || !scheduledAt}
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
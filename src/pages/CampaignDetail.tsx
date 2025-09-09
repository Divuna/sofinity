import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Save, 
  Play, 
  Pause, 
  Calendar, 
  BarChart3, 
  MessageSquare, 
  ArrowLeft,
  Mail,
  FileText,
  Video,
  Target,
  Plus,
  Copy
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'done';
  targeting: string | null;
  email: string | null;
  post: string | null;
  video: string | null;
  created_at: string;
  user_id: string;
  email_mode: 'test' | 'production' | null;
}

interface CampaignSchedule {
  id: string;
  channel: string;
  content: string;
  publish_at: string;
  published: boolean;
}

interface CampaignReport {
  id: string;
  open_rate: number | null;
  click_rate: number | null;
  summary_text: string | null;
}

interface CampaignFeedback {
  id: string;
  rating: number | null;
  comment: string | null;
  sentiment: string | null;
  created_at: string;
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [schedule, setSchedule] = useState<CampaignSchedule[]>([]);
  const [reports, setReports] = useState<CampaignReport | null>(null);
  const [feedback, setFeedback] = useState<CampaignFeedback[]>([]);
  const [contactsCount, setContactsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmailMode, setUserEmailMode] = useState<'test' | 'production'>('production');

  useEffect(() => {
    if (id) {
      fetchUserEmailMode();
      fetchCampaignData();
    }
  }, [id]);

  const fetchUserEmailMode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_preferences')
        .select('email_mode')
        .eq('user_id', user.id)
        .single();

      if (data?.email_mode && (data.email_mode === 'test' || data.email_mode === 'production')) {
        setUserEmailMode(data.email_mode);
      }
    } catch (error) {
      console.error('Error fetching user email mode:', error);
    }
  };

  const fetchCampaignData = async () => {
    try {
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('Campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData as Campaign);

      // Fetch schedule
      const { data: scheduleData } = await supabase
        .from('CampaignSchedule')
        .select('*')
        .eq('campaign_id', id);
      setSchedule(scheduleData || []);

      // Fetch reports
      const { data: reportsData } = await supabase
        .from('CampaignReports')
        .select('*')
        .eq('campaign_id', id)
        .single();
      setReports(reportsData);

      // Fetch feedback
      const { data: feedbackData } = await supabase
        .from('Feedback')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });
      setFeedback(feedbackData || []);

      // Fetch contacts count for this campaign
      const { count: contactsCount } = await supabase
        .from('campaign_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id);
      setContactsCount(contactsCount || 0);

    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data kampaně",
        variant: "destructive"
      });
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!campaign) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('Campaigns')
        .update({
          name: campaign.name,
          targeting: campaign.targeting,
          email: campaign.email,
          post: campaign.post,
          video: campaign.video,
          status: campaign.status,
          email_mode: campaign.email_mode
        })
        .eq('id', campaign.id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      toast({
        title: "Uloženo",
        description: "Kampaň byla úspěšně aktualizována"
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmails = async () => {
    if (!campaign) return;
    
    // Check if there are contacts before sending
    if (contactsCount === 0) {
      toast({
        title: "Chyba",
        description: "Přidejte alespoň jeden kontakt ke kampani",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-campaign-emails', {
        body: { campaignId: campaign.id }
      });

      if (error) throw error;

      // Apply hierarchical logic to determine final email mode
      const finalEmailMode = userEmailMode === 'test' 
        ? 'test' 
        : (campaign.email_mode || 'production');
      
      // Use consistent variable naming for the effective email mode
      const effectiveEmailMode = finalEmailMode;
      
      // Show individual toast for each email result
      if (data.emailResults && Array.isArray(data.emailResults)) {
        data.emailResults.forEach((result: any) => {
          if (result.status === 'success') {
            toast({
              title: "E-mail odeslán",
              description: `E‑mail odeslán uživateli: ${result.email}`
            });
          } else if (result.status === 'error') {
            toast({
              title: "Chyba při odesílání",
              description: `Nepodařilo se odeslat e‑mail: ${result.email} – důvod: ${result.error}`,
              variant: "destructive"
            });
          }
        });
      }

      toast({
        title: effectiveEmailMode === 'test' ? "Test kampaň spuštěna" : "E-maily byly odeslány", 
        description: effectiveEmailMode === 'test'
          ? "Všechny e-maily byly přesměrovány na testovací adresu"
          : (data.message || "E-maily byly úspěšně odeslány všem příjemcům")
      });

      // Update campaign status to active
      const { error: updateError } = await supabase
        .from('Campaigns')
        .update({ status: 'active' })
        .eq('id', campaign.id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (!updateError) {
        setCampaign({ ...campaign, status: 'active' });
      }

    } catch (error: any) {
      console.error('Error sending emails:', error);
      toast({
        title: "Nepodařilo se odeslat e-maily",
        description: "Zkontrolujte připojení nebo režim – " + (error.message || 'Neznámá chyba'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaignStatus = async () => {
    if (!campaign) return;
    
    const newStatus = campaign.status === 'active' ? 'draft' : 'active';
    
    try {
      const { error } = await supabase
        .from('Campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setCampaign({ ...campaign, status: newStatus });
      toast({
        title: "Stav změněn",
        description: `Kampaň je nyní ${newStatus === 'active' ? 'aktivní' : 'pozastavena'}`
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit stav kampaně",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = async () => {
    if (!campaign) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const duplicateData = {
        name: `${campaign.name} (kopie)`,
        status: 'draft' as const,
        targeting: campaign.targeting,
        email: campaign.email,
        post: campaign.post,
        video: campaign.video,
        project: null,
        project_id: null,
        user_id: user.id,
        email_mode: null // Reset to default for duplicates
      };

      const { data: newCampaign, error } = await supabase
        .from('Campaigns')
        .insert(duplicateData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Duplikace byla úspěšně vytvořena",
        description: "Přesměrování na novou kampaň..."
      });

      navigate(`/campaigns/${newCampaign.id}`);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit duplikaci",
        variant: "destructive"
      });
    }
  };

  const handleEmailModeToggle = async (checked: boolean) => {
    if (!campaign) return;
    
    const newEmailMode = checked ? 'production' : 'test';
    
    // Optimistic update
    setCampaign({ 
      ...campaign, 
      email_mode: newEmailMode 
    });
    
    try {
      const { error } = await supabase
        .from('Campaigns')
        .update({ email_mode: newEmailMode })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Režim e-mailů byl změněn",
        description: `Režim e-mailů byl změněn na ${newEmailMode === 'production' ? 'PRODUKČNÍ' : 'TESTOVACÍ'}`
      });
    } catch (error) {
      // Revert optimistic update on error
      setCampaign({ 
        ...campaign, 
        email_mode: campaign.email_mode 
      });
      
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit režim e-mailů",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Načítání kampaně...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Kampaň nenalezena</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                {campaign.status === 'active' ? 'Aktivní' : 
                 campaign.status === 'done' ? 'Dokončeno' : 'Koncept'}
              </Badge>
              <span className="text-muted-foreground text-sm">
                Vytvořeno {new Date(campaign.created_at).toLocaleDateString('cs-CZ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/campaigns/${id}/schedule`)}>
            <Plus className="w-4 h-4 mr-2" />
            Přidat do plánu
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplikovat
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    variant="outline" 
                    onClick={campaign.status === 'active' ? toggleCampaignStatus : handleSendEmails} 
                    disabled={saving || (campaign.status !== 'active' && contactsCount === 0)}
                  >
                    {campaign.status === 'active' ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pozastavit kampaň
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Spustit kampaň
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {campaign.status !== 'active' && contactsCount === 0 && (
                <TooltipContent>
                  <p>Kampaň nemá žádné kontakty</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Ukládání...' : 'Uložit'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Základní informace</TabsTrigger>
          <TabsTrigger value="content">Obsah</TabsTrigger>
          <TabsTrigger value="schedule">Plán publikace</TabsTrigger>
          <TabsTrigger value="reports">Výsledky</TabsTrigger>
          <TabsTrigger value="feedback">Zpětná vazba</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Základní informace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Název kampaně</label>
                <Input
                  value={campaign.name}
                  onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Stav</label>
                <Select 
                  value={campaign.status} 
                  onValueChange={(value: 'draft' | 'active' | 'done') => 
                    setCampaign({ ...campaign, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Koncept</SelectItem>
                    <SelectItem value="active">Aktivní</SelectItem>
                    <SelectItem value="done">Dokončeno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-mode" className="text-sm font-medium">
                    Režim e-mailů
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="email-mode" className={`text-sm ${userEmailMode === 'test' ? 'text-muted-foreground' : ''}`}>
                      Testovací
                    </Label>
                    <Switch
                      id="email-mode"
                      checked={campaign.email_mode === 'production'}
                      onCheckedChange={handleEmailModeToggle}
                      disabled={userEmailMode === 'test'}
                    />
                    <Label htmlFor="email-mode" className={`text-sm ${userEmailMode === 'test' ? 'text-muted-foreground' : ''}`}>
                      Produkční
                    </Label>
                  </div>
                </div>
                {userEmailMode === 'test' && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <p>Globální testovací režim je aktivní - všechny e-maily budou přesměrovány</p>
                    <p>
                      Pro povolení produkčního režimu u kampaní přejděte do{' '}
                      <button 
                        onClick={() => navigate('/settings')} 
                        className="text-primary hover:underline font-medium"
                      >
                        Nastavení
                      </button>
                    </p>
                  </div>
                )}
                {userEmailMode === 'production' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Aktuální režim: {campaign.email_mode === 'production' ? 'Produkční' : 'Testovací'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cílení</label>
                <Textarea
                  value={campaign.targeting || ''}
                  onChange={(e) => setCampaign({ ...campaign, targeting: e.target.value })}
                  placeholder="Popište cílovou skupinu..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  E-mail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={campaign.email || ''}
                  onChange={(e) => setCampaign({ ...campaign, email: e.target.value })}
                  placeholder="Obsah e-mailu..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Social post
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={campaign.post || ''}
                  onChange={(e) => setCampaign({ ...campaign, post: e.target.value })}
                  placeholder="Text pro sociální sítě..."
                  rows={4}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={campaign.video || ''}
                  onChange={(e) => setCampaign({ ...campaign, video: e.target.value })}
                  placeholder="Video script nebo odkaz..."
                  rows={6}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Plán publikace
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.length > 0 ? (
                <div className="space-y-4">
                  {schedule.map((item) => (
                    <div key={item.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.channel}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.publish_at).toLocaleString('cs-CZ')}
                          </span>
                        </div>
                        <Badge variant={item.published ? 'default' : 'secondary'}>
                          {item.published ? 'Publikováno' : 'Čeká'}
                        </Badge>
                      </div>
                      <p className="text-sm">{item.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Žádné naplánované publikace
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Výsledky kampaně
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {reports.open_rate ? `${reports.open_rate}%` : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Míra otevření</div>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {reports.click_rate ? `${reports.click_rate}%` : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Míra kliknutí</div>
                  </div>
                  {reports.summary_text && (
                    <div className="md:col-span-2 p-4 border border-border rounded-lg">
                      <h4 className="font-medium mb-2">Shrnutí výkonu</h4>
                      <p className="text-sm text-muted-foreground">{reports.summary_text}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Zatím nejsou k dispozici žádné reporty
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Zpětná vazba
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedback.length > 0 ? (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div key={item.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {item.rating && (
                            <Badge variant="outline">
                              {item.rating}/5 ⭐
                            </Badge>
                          )}
                          {item.sentiment && (
                            <Badge variant={
                              item.sentiment === 'positive' ? 'default' :
                              item.sentiment === 'negative' ? 'destructive' : 'secondary'
                            }>
                              {item.sentiment === 'positive' ? 'Pozitivní' :
                               item.sentiment === 'negative' ? 'Negativní' : 'Neutrální'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('cs-CZ')}
                        </span>
                      </div>
                      {item.comment && (
                        <p className="text-sm">{item.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Zatím není k dispozici žádná zpětná vazba
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
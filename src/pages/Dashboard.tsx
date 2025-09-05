import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { ProjectSelector } from '@/components/Dashboard/ProjectSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Mail,
  Calendar,
  Sparkles,
  Play,
  Pause,
  BarChart3,
  Target,
  Eye,
  MousePointer,
  FolderOpen,
  Settings,
  Plus,
  Link,
  Link2,
  Link2Off,
  Brain,
  Clock
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'done';
  email: string | null;
  post: string | null;
  video: string | null;
  project_id: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  external_connection: string | null;
  created_at: string;
  campaignCount?: number;
  emailCount?: number;
  aiRequestCount?: number;
}

interface DashboardStats {
  activeCampaigns: number;
  totalEmails: number;
  totalContacts: number;
  avgOpenRate: number;
  totalProjects: number;
  totalOffers: number;
  acceptedOffers: number;
  offersSuccessRate: number;
}

interface AIRequest {
  id: string;
  type: string;
  prompt: string;
  response: string | null;
  status: string;
  created_at: string;
  project_id: string | null;
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [aiRequests, setAiRequests] = useState<AIRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: 0,
    totalEmails: 0,
    totalContacts: 0,
    avgOpenRate: 0,
    totalProjects: 0,
    totalOffers: 0,
    acceptedOffers: 0,
    offersSuccessRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { selectedProject, setSelectedProject } = useSelectedProject();
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    loadUserProfile();
  }, [selectedProject]);

  const loadUserProfile = async () => {
    try {
      const user = await getCurrentUser();
      setUserProfile(user);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch campaigns with project_id
      let campaignsQuery = supabase
        .from('Campaigns')
        .select('*, project_id')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (selectedProject?.id) {
        campaignsQuery = campaignsQuery.eq('project_id', selectedProject.id);
      }
      
      const { data: campaignsData, error: campaignsError } = await campaignsQuery;

      if (campaignsError) throw campaignsError;
      setCampaigns((campaignsData || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status as 'draft' | 'active' | 'done',
        email: campaign.email,
        post: campaign.post,
        video: campaign.video,
        project_id: campaign.project_id,
        created_at: campaign.created_at
      })));

      // Fetch AI requests filtered by selected project
      let aiRequestsQuery = supabase
        .from('AIRequests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (selectedProject?.id) {
        aiRequestsQuery = aiRequestsQuery.eq('project_id', selectedProject.id);
      }
      
      const { data: aiRequestsData, error: aiRequestsError } = await aiRequestsQuery;
      
      if (aiRequestsError) throw aiRequestsError;
      setAiRequests((aiRequestsData || []).map(request => ({
        id: request.id,
        type: request.type,
        prompt: request.prompt,
        response: request.response,
        status: request.status,
        created_at: request.created_at,
        project_id: request.project_id
      })));

      // Fetch projects with counts
      const { data: projectsData, error: projectsError } = await supabase
        .from('Projects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // For each project, get counts of related data
      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const [
            { count: campaignCount },
            { count: emailCount },
            { count: aiRequestCount }
          ] = await Promise.all([
            supabase.from('Campaigns').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
            supabase.from('Emails').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
            supabase.from('AIRequests').select('*', { count: 'exact', head: true }).eq('project_id', project.id)
          ]);

          return {
            ...project,
            campaignCount: campaignCount || 0,
            emailCount: emailCount || 0,
            aiRequestCount: aiRequestCount || 0
          };
        })
      );

      setProjects(projectsWithCounts);

      // Fetch dashboard statistics
      let activeCampaignsQuery = supabase.from('Campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active');
      let emailsQuery = supabase.from('Emails').select('*', { count: 'exact', head: true });
      let contactsQuery = supabase.from('Contacts').select('*', { count: 'exact', head: true }).eq('subscribed', true);
      let projectsQuery = supabase.from('Projects').select('*', { count: 'exact', head: true }).eq('is_active', true);
      let emailLogsQuery = supabase.from('EmailLogs').select('opened_at, campaign_id').not('opened_at', 'is', null);
      let totalEmailLogsQuery = supabase.from('EmailLogs').select('*', { count: 'exact', head: true });
      let offersQuery = supabase.from('offers').select('*', { count: 'exact', head: true });
      let acceptedOffersQuery = supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'accepted');

      if (selectedProject?.id) {
        activeCampaignsQuery = activeCampaignsQuery.eq('project_id', selectedProject.id);
        emailsQuery = emailsQuery.eq('project_id', selectedProject.id);
        contactsQuery = contactsQuery.eq('project_id', selectedProject.id);
        offersQuery = offersQuery.eq('project_id', selectedProject.id);
        acceptedOffersQuery = acceptedOffersQuery.eq('project_id', selectedProject.id);
        
        // Filter email logs by campaigns in the selected project
        const { data: projectCampaigns } = await supabase
          .from('Campaigns')
          .select('id')
          .eq('project_id', selectedProject.id);
        
        const campaignIds = projectCampaigns?.map(c => c.id) || [];
        if (campaignIds.length > 0) {
          emailLogsQuery = emailLogsQuery.in('campaign_id', campaignIds);
          totalEmailLogsQuery = totalEmailLogsQuery.in('campaign_id', campaignIds);
        }
      }

      const [
        { count: activeCampaignsCount },
        { count: totalEmailsCount },
        { count: totalContactsCount },
        { count: totalProjectsCount },
        { data: emailLogsData },
        { count: totalSentEmails },
        { count: totalOffersCount },
        { count: acceptedOffersCount }
      ] = await Promise.all([
        activeCampaignsQuery,
        emailsQuery,
        contactsQuery,
        projectsQuery,
        emailLogsQuery,
        totalEmailLogsQuery,
        offersQuery,
        acceptedOffersQuery
      ]);

      // Calculate average open rate based on sent emails vs opened emails
      const sentEmailsCount = totalSentEmails || 0;
      const openedEmails = emailLogsData?.length || 0;
      const avgOpenRate = sentEmailsCount > 0 ? (openedEmails / sentEmailsCount) * 100 : 0;

      // Calculate offers success rate
      const totalOffers = totalOffersCount || 0;
      const acceptedOffers = acceptedOffersCount || 0;
      const offersSuccessRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;

      setStats({
        activeCampaigns: activeCampaignsCount || 0,
        totalEmails: totalEmailsCount || 0,
        totalContacts: totalContactsCount || 0,
        avgOpenRate: Math.round(avgOpenRate * 10) / 10,
        totalProjects: totalProjectsCount || 0,
        totalOffers: totalOffers,
        acceptedOffers: acceptedOffers,
        offersSuccessRate: Math.round(offersSuccessRate * 10) / 10
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data dashboardu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getContentProgress = (campaign: Campaign) => {
    let completed = 0;
    const total = 3;
    
    if (campaign.email) completed++;
    if (campaign.post) completed++;
    if (campaign.video) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getRequestTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'campaign_generator': 'Generátor kampaní',
      'email_assistant': 'Email asistent',
      'content_optimizer': 'Optimalizace obsahu',
      'analytics_insight': 'Analýza dat'
    };
    return typeMap[type] || type;
  };

  const handleProjectConnection = async (project: Project) => {
    try {
      const session = await supabase.auth.getSession();
      
      if (project.external_connection) {
        const confirmed = confirm("Opravdu chcete odpojit projekt od Sofinity?");
        if (!confirmed) return;

        const { error } = await supabase
          .from("Projects")
          .update({ external_connection: null })
          .eq("id", project.id);

        if (error) throw error;

        toast({ title: "Projekt byl odpojen od Sofinity." });
        await fetchDashboardData();
      } else {
        const { data, error } = await supabase.functions.invoke("connect-opravo-sofinity", {
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });

        if (error) {
          toast({ 
            title: "Chyba při připojení", 
            description: error.message, 
            variant: "destructive" 
          });
        } else {
          toast({ title: "Projekt byl znovu propojen se Sofinity ✅" });
          await fetchDashboardData();
        }
      }
    } catch (error) {
      console.error('Error handling project connection:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit stav připojení projektu",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání dashboardu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Dashboard{selectedProject ? ` — ${selectedProject.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Přehled vašich AI marketingových kampaní
          </p>
        </div>
        <Button variant="gradient" className="shadow-strong" asChild>
          <a href="/campaign/new">
            <Sparkles className="w-4 h-4 mr-2" />
            Nová kampaň
          </a>
        </Button>
      </div>

      {/* Horizontal Project Selector */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Projekty</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedProject(null)}
            className={`flex-shrink-0 px-4 py-3 rounded-lg border transition-all duration-200 min-w-[120px] ${
              !selectedProject 
                ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                : 'bg-surface border-border hover:bg-surface-variant hover:shadow-soft'
            }`}
          >
            <div className="text-sm font-medium">Všechny projekty</div>
            <div className="text-xs opacity-75 mt-1">{projects.length} projektů</div>
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject({ id: project.id, name: project.name })}
              className={`flex-shrink-0 px-4 py-3 rounded-lg border transition-all duration-200 min-w-[140px] ${
                selectedProject?.id === project.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-surface border-border hover:bg-surface-variant hover:shadow-soft'
              }`}
            >
              <div className="text-sm font-medium text-left">{project.name}</div>
              <div className="text-xs opacity-75 mt-1 text-left">
                {project.campaignCount || 0} kampaní · {project.emailCount || 0} emailů
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Aktivní kampaně"
          value={stats.activeCampaigns.toString()}
          change={`${campaigns.filter(c => c.status === 'active').length} z ${campaigns.length} posledních`}
          changeType="positive"
          icon={Target}
          gradient
        />
        <StatsCard
          title="Celkem kontaktů"
          value={stats.totalContacts.toString()}
          change={selectedProject ? "V aktuálním projektu" : "Aktivní odběratelé"}
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Odeslané e-maily"
          value={stats.totalEmails.toString()}
          change={selectedProject ? "V aktuálním projektu" : "Celkem v systému"}
          changeType="positive"
          icon={Mail}
        />
        <StatsCard
          title="Celkem nabídek"
          value={stats.totalOffers.toString()}
          change={selectedProject ? "V aktuálním projektu" : "Celkem v systému"}
          changeType="positive"
          icon={MessageSquare}
        />
        <StatsCard
          title="Úspěšnost nabídek"
          value={`${stats.offersSuccessRate}%`}
          change={`${stats.acceptedOffers} vyhrané z ${stats.totalOffers}`}
          changeType={stats.offersSuccessRate > 50 ? "positive" : stats.offersSuccessRate >= 25 ? "neutral" : "negative"}
          icon={TrendingUp}
        />
      </div>

      {/* AI Requests Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Nedávné AI žádosti
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a href="/ai-assistant">
              <Eye className="w-4 h-4 mr-2" />
              Zobrazit vše
            </a>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiRequests.length > 0 ? (
            aiRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 rounded-lg border border-border bg-surface-variant hover:shadow-soft transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs">
                      {getRequestTypeLabel(request.type)}
                    </Badge>
                    <Badge 
                      variant={request.status === 'completed' ? 'default' : 
                              request.status === 'waiting' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {request.status === 'completed' ? 'Dokončeno' :
                       request.status === 'waiting' ? 'Čekání' : 'Chyba'}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(request.created_at).toLocaleDateString('cs-CZ')}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-foreground">Zadání: </span>
                    <span className="text-sm text-muted-foreground">
                      {truncateText(request.prompt, 120)}
                    </span>
                  </div>
                  
                  {request.response && (
                    <div>
                      <span className="text-sm font-medium text-foreground">Odpověď: </span>
                      <span className="text-sm text-muted-foreground">
                        {truncateText(request.response, 120)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedProject ? 'Žádné AI žádosti pro tento projekt' : 'Zatím nemáte žádné AI žádosti'}
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/ai-assistant">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Začít s AI asistentem
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Project Selector */}
        <div>
          <ProjectSelector />
        </div>

        {/* Recent Campaigns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Nedávné kampaně</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <a href="/campaigns">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Zobrazit vše
                </a>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 rounded-lg border border-border bg-surface-variant hover:shadow-soft transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-foreground">{campaign.name}</h3>
                        <Badge 
                          variant={
                            campaign.status === 'active' ? 'default' :
                            campaign.status === 'done' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {campaign.status === 'active' ? 'Aktivní' :
                           campaign.status === 'done' ? 'Dokončeno' : 'Koncept'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          asChild
                        >
                          <a href={`/campaign/${campaign.id}`}>
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Obsah dokončen</span>
                        <span>{getContentProgress(campaign)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${getContentProgress(campaign)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Vytvořeno: {new Date(campaign.created_at).toLocaleDateString('cs-CZ')}</span>
                      <span>
                        {campaign.email ? '📧' : ''} 
                        {campaign.post ? '📱' : ''} 
                        {campaign.video ? '🎥' : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Zatím nemáte žádné kampaně</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <a href="/campaign/new">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Vytvořit první kampaň
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects Overview */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <FolderOpen className="w-5 h-5 mr-2" />
                Projekty
              </CardTitle>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 rounded-lg border bg-surface-variant hover:shadow-soft transition-all duration-300 ${
                      project.external_connection ? 'border-success border-2' : 'border-border'
                    }`}
                  >
                     <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{project.name}</h4>
                        <div className="flex items-center gap-2">
                          {project.external_connection && (
                            <div className="text-xs text-success font-medium">
                              Propojeno se Sofinity ({project.external_connection})
                            </div>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={async () => {
                                    if (project.external_connection) {
                                      if (confirm('Opravdu chcete odpojit tento projekt od Sofinity?')) {
                                        const { error } = await supabase
                                          .from('Projects')
                                          .update({ external_connection: null })
                                          .eq('id', project.id);
                                        
                                        if (!error) {
                                          toast({ title: 'Projekt byl úspěšně odpojen.' });
                                          await fetchDashboardData();
                                        } else {
                                          toast({ title: 'Chyba při odpojování projektu.', variant: 'destructive' });
                                        }
                                      }
                                    } else {
                                      await handleProjectConnection(project);
                                    }
                                  }}
                                >
                                  {project.external_connection ? (
                                    <Link2 className="w-4 h-4 text-success" />
                                  ) : (
                                    <Link2Off className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {project.external_connection 
                                  ? 'Klikněte pro odpojení' 
                                  : 'Klikněte pro připojení'
                                }
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {project.is_active ? 'Aktivní' : 'Neaktivní'}
                        </Badge>
                      </div>
                    
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {project.description}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-foreground">{project.campaignCount || 0}</div>
                        <div className="text-muted-foreground">Kampaně</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-foreground">{project.emailCount || 0}</div>
                        <div className="text-muted-foreground">E-maily</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-foreground">{project.aiRequestCount || 0}</div>
                        <div className="text-muted-foreground">AI žádosti</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Žádné projekty</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
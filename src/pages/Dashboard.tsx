import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { OneMilOverview } from '@/components/Dashboard/OneMilOverview';
import { AIEvaluationOverview } from '@/components/Dashboard/AIEvaluationOverview';
import { RealtimeNotificationFeed } from '@/components/RealtimeNotificationFeed';

import PostForm from '@/components/PostForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getSofinityStatus, type SofinityStatus } from '@/lib/integrations';
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
  sofinityStatus?: SofinityStatus;
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
  status_label: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  event_name: string | null;
  metadata: any;
}

interface Post {
  id: string;
  channel: string;
  text: string;
  created_at: string;
  status: string;
  project_id: string | null;
}

interface OneMilEvent {
  id: string;
  event_name: string;
  metadata: any;
  timestamp: string;
  project_id: string | null;
  user_id: string | null;
}

interface Reaction {
  id: string;
  event_id: string;
  summary: string;
  recommendation: string;
  ai_confidence: number;
  created_at: string;
  user_id: string;
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [aiRequests, setAiRequests] = useState<AIRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [oneMilEvents, setOneMilEvents] = useState<OneMilEvent[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [projectStatuses, setProjectStatuses] = useState<Record<string, SofinityStatus>>({});
  const [showAllAiRequests, setShowAllAiRequests] = useState(false);
  const [showAllOneMilEvents, setShowAllOneMilEvents] = useState(false);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
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

    // Subscribe to real-time updates for AIRequests
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'AIRequests'
        },
        () => {
          console.log('AIRequests changed, refetching dashboard data');
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      // Fetch AI requests using AIRequests_View_Recent, including Email Assistant and system requests
      let aiRequestsQuery = supabase
        .from('AIRequests_View_Recent' as any)
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (selectedProject?.id) {
        aiRequestsQuery = aiRequestsQuery.or(`project_id.is.null,project_id.eq.${selectedProject.id}`);
      }
      
      const { data: aiRequestsData, error: aiRequestsError } = await aiRequestsQuery;
      
      if (aiRequestsError) throw aiRequestsError;
      setAiRequests((aiRequestsData || []).map((request: any) => ({
        id: request.id,
        type: request.type,
        prompt: request.prompt,
        response: request.response,
        status: request.status,
        status_label: request.status || 'waiting',
        created_at: request.created_at,
        updated_at: request.updated_at,
        project_id: request.project_id,
        event_name: request.event_name || null,
        metadata: request.metadata || null
      })));

      // Fetch recent posts filtered by selected project
      let postsQuery = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (selectedProject?.id) {
        postsQuery = postsQuery.eq('project_id', selectedProject.id);
      }
      
      const { data: postsData, error: postsError } = await postsQuery;
      
      if (postsError) throw postsError;
      setPosts((postsData || []).map(post => ({
        id: post.id,
        channel: post.channel,
        text: post.text,
        created_at: post.created_at,
        status: post.status,
        project_id: post.project_id
      })));

      // Fetch recent OneMil events from EventLogs
      let oneMilEventsQuery = supabase
        .from('EventLogs')
        .select('*')
        .in('event_name', [
          'contest_created', 
          'contest_updated', 
          'ticket_created', 
          'winner_selected', 
          'voucher_generated',
          'prize_won',
          'coin_redeemed',
          'voucher_purchased',
          'user_registered',
          'notification_sent',
          'contest_closed'
        ])
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (selectedProject?.id) {
        oneMilEventsQuery = oneMilEventsQuery.eq('project_id', selectedProject.id);
      }
      
      const { data: oneMilEventsData, error: oneMilEventsError } = await oneMilEventsQuery;
      
      if (oneMilEventsError) {
        console.error('Error fetching OneMil events:', oneMilEventsError);
      } else {
        setOneMilEvents((oneMilEventsData || []).map(event => ({
          id: event.id,
          event_name: event.event_name,
          metadata: event.metadata,
          timestamp: event.timestamp,
          project_id: event.project_id,
          user_id: event.user_id
        })));
      }

      // Fetch recent AI reactions
      let reactionsQuery = supabase
        .from('Reactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (selectedProject?.id) {
        // Filter by events from the selected project
        const { data: projectEvents } = await supabase
          .from('EventLogs')
          .select('id')
          .eq('project_id', selectedProject.id);
        
        const eventIds = projectEvents?.map(e => e.id) || [];
        if (eventIds.length > 0) {
          reactionsQuery = reactionsQuery.in('event_id', eventIds);
        }
      }
      
      const { data: reactionsData, error: reactionsError } = await reactionsQuery;
      
      if (reactionsError) {
        console.error('Error fetching reactions:', reactionsError);
      } else {
        setReactions((reactionsData || []).map(reaction => ({
          id: reaction.id,
          event_id: reaction.event_id,
          summary: reaction.summary,
          recommendation: reaction.recommendation,
          ai_confidence: reaction.ai_confidence,
          created_at: reaction.created_at,
          user_id: reaction.user_id
        })));
      }

      // Fetch projects with counts
      const { data: projectsData, error: projectsError } = await supabase
        .from('Projects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // For each project, get counts of related data and check Sofinity status
      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const [
            { count: campaignCount },
            { count: emailCount },
            { count: aiRequestCount }
          ] = await Promise.all([
            supabase.from('Campaigns').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
            supabase.from('Emails').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
            supabase.from('v_ai_requests_status').select('*', { count: 'exact', head: true }).eq('project_id', project.id)
          ]);

          // Check Sofinity status dynamically
          let sofinityStatus: SofinityStatus | undefined;
          try {
            sofinityStatus = await getSofinityStatus(project.id);
            console.log(`✅ [Dashboard] Sofinity status for ${project.name}:`, sofinityStatus);
          } catch (error) {
            console.error(`❌ [Dashboard] Failed to get Sofinity status for ${project.name}:`, error);
          }

          return {
            ...project,
            campaignCount: campaignCount || 0,
            emailCount: emailCount || 0,
            aiRequestCount: aiRequestCount || 0,
            sofinityStatus
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

  const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (!text) return '';
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

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'waiting':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleProjectConnection = async (project: Project) => {
    try {
      const session = await supabase.auth.getSession();
      
      if (project.external_connection) {
        const confirmed = confirm("Opravdu chcete odpojit projekt od Sofinity?");
        if (!confirmed) return;

        // Use disconnect-sofinity edge function
        const { data, error } = await supabase.functions.invoke("disconnect-sofinity", {
          body: { project_id: project.id },
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });

        if (error) {
          toast({ 
            title: "Chyba při odpojení", 
            description: error.message, 
            variant: "destructive" 
          });
          return;
        }

        toast({ title: "Projekt byl odpojen od Sofinity." });
        await fetchDashboardData();
      } else {
        // Use connect-sofinity edge function
        const { data, error } = await supabase.functions.invoke("connect-sofinity", {
          body: { project_id: project.id },
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
          <RouterLink to="/campaign/new">
            <Sparkles className="w-4 h-4 mr-2" />
            Nová kampaň
          </RouterLink>
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
            <div className="text-xs opacity-75 mt-1">{Array.isArray(projects) ? projects.length : 0} projektů</div>
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
            <div className="text-sm font-medium text-left truncate">{project.name}</div>
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
          change={`${Array.isArray(campaigns) ? campaigns.filter(c => c.status === 'active').length : 0} z ${Array.isArray(campaigns) ? campaigns.length : 0} posledních`}
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

      {/* Notification Feed */}
      <div className="mt-6">
        <RealtimeNotificationFeed />
      </div>

      {/* AI Requests Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Nedávné AI žádosti
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <RouterLink to="/ai-assistant">
              <Eye className="w-4 h-4 mr-2" />
              Zobrazit vše
            </RouterLink>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.isArray(aiRequests) && aiRequests.length > 0 ? (
            <>
              {aiRequests.length > 5 && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllAiRequests(!showAllAiRequests)}
                    className="w-full max-w-xs"
                  >
                    {showAllAiRequests ? 'Skrýt' : 'Zobrazit vše'}
                  </Button>
                </div>
              )}
              
              {(showAllAiRequests ? aiRequests : aiRequests.slice(0, 5)).map((request) => (
              <div
                key={request.id}
                className="p-4 rounded-lg border border-border bg-surface-variant hover:shadow-soft transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs">
                      {getRequestTypeLabel(request.type)}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(request.status)} className="text-xs">
                      {request.status_label}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(request.updated_at).toLocaleDateString('cs-CZ')}
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
              ))}
              
              {aiRequests.length > 5 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllAiRequests(!showAllAiRequests)}
                    className="w-full max-w-xs"
                  >
                    {showAllAiRequests ? 'Skrýt' : 'Zobrazit vše'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedProject ? 'Žádné AI žádosti pro tento projekt' : 'Zatím nemáte žádné AI žádosti'}
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <RouterLink to="/ai-assistant">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Začít s AI asistentem
                </RouterLink>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OneMil Campaign & AI Overview */}
      <OneMilOverview projectId={selectedProject?.id} />

      {/* OneMil Events Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Target className="w-5 h-5 mr-2" />
            OneMil události
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <RouterLink to="/onemill-audit">
              <Eye className="w-4 h-4 mr-2" />
              Zobrazit vše
            </RouterLink>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.isArray(oneMilEvents) && oneMilEvents.length > 0 ? (
            <>
              {oneMilEvents.length > 5 && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllOneMilEvents(!showAllOneMilEvents)}
                    className="w-full max-w-xs"
                  >
                    {showAllOneMilEvents ? 'Skrýt' : 'Zobrazit vše'}
                  </Button>
                </div>
              )}
              
              {(showAllOneMilEvents ? oneMilEvents : oneMilEvents.slice(0, 5)).map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-lg border border-border bg-surface-variant hover:shadow-soft transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs">
                      {event.event_name.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="default" className="text-xs">
                      OneMil
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(event.timestamp).toLocaleDateString('cs-CZ', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-foreground">Metadata: </span>
                      <span className="text-muted-foreground">
                        {JSON.stringify(event.metadata, null, 2).substring(0, 100)}
                        {JSON.stringify(event.metadata).length > 100 ? '...' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              ))}
              
              {oneMilEvents.length > 5 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllOneMilEvents(!showAllOneMilEvents)}
                    className="w-full max-w-xs"
                  >
                    {showAllOneMilEvents ? 'Skrýt' : 'Zobrazit vše'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedProject ? 'Žádné OneMil události pro tento projekt' : 'Zatím nebyly zaznamenány žádné OneMil události'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Evaluation Section */}
      <AIEvaluationOverview aiRequests={aiRequests} />

      {/* Recent Posts Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Nedávné příspěvky
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat příspěvek
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <PostForm onSuccess={() => {
                  setIsPostModalOpen(false);
                  fetchDashboardData();
                }} />
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" asChild>
              <RouterLink to="/planovac-publikace">
                <Eye className="w-4 h-4 mr-2" />
                Zobrazit vše
              </RouterLink>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.isArray(posts) && posts.length > 0 ? (
            <>
              {posts.length > 5 && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllPosts(!showAllPosts)}
                    className="w-full max-w-xs"
                  >
                    {showAllPosts ? 'Skrýt' : 'Zobrazit vše'}
                  </Button>
                </div>
              )}
              
              {(showAllPosts ? posts : posts.slice(0, 5)).map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-lg border border-border bg-surface-variant hover:shadow-soft transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-xs">
                      {post.channel}
                    </Badge>
                    <Badge 
                      variant={post.status === 'published' ? 'default' : 
                              post.status === 'planned' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {post.status === 'published' ? 'Publikováno' :
                       post.status === 'planned' ? 'Naplánováno' : 
                       post.status === 'draft' ? 'Koncept' : post.status}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(post.created_at).toLocaleDateString('cs-CZ', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-foreground">
                    <strong>Text:</strong> {truncateText(post.text, 80)}
                  </div>
                </div>
              </div>
              ))}
              
              {posts.length > 5 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllPosts(!showAllPosts)}
                    className="w-full max-w-xs"
                  >
                    {showAllPosts ? 'Skrýt' : 'Zobrazit vše'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Žádné příspěvky</p>
              <p>
                {selectedProject 
                  ? `Zatím nebyly vytvořeny žádné příspěvky pro projekt ${selectedProject.name}`
                  : 'Zatím nebyly vytvořeny žádné příspěvky'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Campaigns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Nedávné kampaně</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <RouterLink to="/campaigns">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Zobrazit vše
                </RouterLink>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.isArray(campaigns) && campaigns.length > 0 ? (
                <>
                  {campaigns.length > 5 && (
                    <div className="flex justify-center pb-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllCampaigns(!showAllCampaigns)}
                        className="w-full max-w-xs"
                      >
                        {showAllCampaigns ? 'Skrýt' : 'Zobrazit vše'}
                      </Button>
                    </div>
                  )}
                  
                  {(showAllCampaigns ? campaigns : campaigns.slice(0, 5)).map((campaign) => (
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
                          <RouterLink to={`/campaign/${campaign.id}`}>
                            <Eye className="h-4 w-4" />
                          </RouterLink>
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
                  ))}
                  
                  {campaigns.length > 5 && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllCampaigns(!showAllCampaigns)}
                        className="w-full max-w-xs"
                      >
                        {showAllCampaigns ? 'Skrýt' : 'Zobrazit vše'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Zatím nemáte žádné kampaně</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <RouterLink to="/campaign/new">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Vytvořit první kampaň
                    </RouterLink>
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
              {Array.isArray(projects) && projects.length > 0 ? (
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
                          {project.external_connection ? (
                            <Badge variant="default" className="text-xs">
                              <Link2 className="w-3 h-3 mr-1" />
                              Propojeno se Sofinity
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Link2Off className="w-3 h-3 mr-1" />
                              Nepřipojeno
                            </Badge>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleProjectConnection(project)}
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
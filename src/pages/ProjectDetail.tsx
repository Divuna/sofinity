import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  TrendingUp, 
  Users, 
  MessageSquare, 
  Mail,
  Calendar,
  Sparkles,
  Briefcase,
  Wrench,
  Target,
  FolderOpen
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface Email {
  id: string;
  type: string;
  recipient: string;
  created_at: string;
}

interface Post {
  id: string;
  text: string;
  channel: string;
  status: string;
  created_at: string;
}

interface AIRequest {
  id: string;
  type: string;
  prompt: string;
  status: string;
  created_at: string;
}

interface ProjectStats {
  campaigns: number;
  emails: number;
  posts: number;
  contacts: number;
  aiRequests: number;
  offers: number;
  opravoJobs: number;
}

export default function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats>({
    campaigns: 0,
    emails: 0,
    posts: 0,
    contacts: 0,
    aiRequests: 0,
    offers: 0,
    opravoJobs: 0
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [aiRequests, setAIRequests] = useState<AIRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('Projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch stats
      await Promise.all([
        fetchStats(),
        fetchRecentData()
      ]);

    } catch (error) {
      console.error('Error fetching project data:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data projektu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [
        campaignsResult,
        emailsResult,
        postsResult,
        contactsResult,
        aiRequestsResult,
        offersResult,
        opravoJobsResult
      ] = await Promise.all([
        supabase.from('Campaigns').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('Emails').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('posts').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('Contacts').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('AIRequests').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('offers').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('opravojobs').select('id', { count: 'exact' }).eq('project_id', projectId)
      ]);

      setStats({
        campaigns: campaignsResult.count || 0,
        emails: emailsResult.count || 0,
        posts: postsResult.count || 0,
        contacts: contactsResult.count || 0,
        aiRequests: aiRequestsResult.count || 0,
        offers: offersResult.count || 0,
        opravoJobs: opravoJobsResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentData = async () => {
    try {
      const [
        campaignsData,
        emailsData,
        postsData,
        aiRequestsData
      ] = await Promise.all([
        supabase
          .from('Campaigns')
          .select('id, name, status, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('Emails')
          .select('id, type, recipient, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('posts')
          .select('id, text, channel, status, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('AIRequests')
          .select('id, type, prompt, status, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      setCampaigns(campaignsData.data || []);
      setEmails(emailsData.data || []);
      setPosts(postsData.data || []);
      setAIRequests(aiRequestsData.data || []);
    } catch (error) {
      console.error('Error fetching recent data:', error);
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="ghost" 
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zpět na Dashboard
            </Button>
            <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-surface p-6">
        <div className="max-w-7xl mx-auto">
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na Dashboard
          </Button>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Projekt nebyl nalezen.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="ghost" 
            className="mb-4 group h-9 px-3 bg-gradient-primary hover:opacity-90 hover:shadow-medium text-white border-0 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Zpět na Dashboard
          </Button>
          <div className="flex items-center space-x-3">
            <FolderOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-2">{project.description}</p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Kampaně"
            value={stats.campaigns.toString()}
            icon={Target}
            gradient
          />
          <StatsCard
            title="E-maily"
            value={stats.emails.toString()}
            icon={Mail}
          />
          <StatsCard
            title="Příspěvky"
            value={stats.posts.toString()}
            icon={MessageSquare}
          />
          <StatsCard
            title="Kontakty"
            value={stats.contacts.toString()}
            icon={Users}
          />
          <StatsCard
            title="AI Požadavky"
            value={stats.aiRequests.toString()}
            icon={Sparkles}
          />
          <StatsCard
            title="Nabídky"
            value={stats.offers.toString()}
            icon={Briefcase}
          />
          <StatsCard
            title="Opravo Jobs"
            value={stats.opravoJobs.toString()}
            icon={Wrench}
          />
        </div>

        {/* Tabbed Content */}
        <Card>
          <CardHeader>
            <CardTitle>Nedávná aktivita</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="campaigns">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="campaigns">Kampaně</TabsTrigger>
                <TabsTrigger value="emails">E-maily</TabsTrigger>
                <TabsTrigger value="posts">Příspěvky</TabsTrigger>
                <TabsTrigger value="ai-requests">AI Požadavky</TabsTrigger>
              </TabsList>

              <TabsContent value="campaigns" className="mt-6">
                <div className="space-y-4">
                  {campaigns.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Žádné kampaně nenalezeny</p>
                  ) : (
                    campaigns.map((campaign) => (
                      <Card key={campaign.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{campaign.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(campaign.created_at)}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="emails" className="mt-6">
                <div className="space-y-4">
                  {emails.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Žádné e-maily nenalezeny</p>
                  ) : (
                    emails.map((email) => (
                      <Card key={email.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{email.type}</h4>
                            <p className="text-sm text-muted-foreground">
                              Pro: {email.recipient || 'Nezadáno'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(email.created_at)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="posts" className="mt-6">
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Žádné příspěvky nenalezeny</p>
                  ) : (
                    posts.map((post) => (
                      <Card key={post.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{post.channel}</h4>
                            <p className="text-sm text-muted-foreground">
                              {truncateText(post.text)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(post.created_at)}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(post.status)}>
                            {post.status}
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai-requests" className="mt-6">
                <div className="space-y-4">
                  {aiRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Žádné AI požadavky nenalezeny</p>
                  ) : (
                    aiRequests.map((request) => (
                      <Card key={request.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{request.type}</h4>
                            <p className="text-sm text-muted-foreground">
                              {truncateText(request.prompt)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(request.created_at)}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
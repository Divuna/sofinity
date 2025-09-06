import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Target, Mail, Bot, Calendar, Building2 } from 'lucide-react';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
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
  content: string;
  created_at: string;
}

interface AIRequest {
  id: string;
  type: string;
  status: string;
  created_at: string;
}

interface ProjectStats {
  campaigns: number;
  emails: number;
  aiRequests: number;
}

export default function ProjectDetail() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [stats, setStats] = useState<ProjectStats>({ campaigns: 0, emails: 0, aiRequests: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [aiRequests, setAIRequests] = useState<AIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // First try to get project data from router state
    const stateProject = location.state?.SelectedProject;
    
    if (stateProject) {
      const projectData: ProjectData = {
        id: stateProject.id,
        name: stateProject.name,
        description: stateProject.description,
        created_at: stateProject.created_at || new Date().toISOString()
      };
      setProject(projectData);
      fetchProjectData(projectData);
    } else {
      // Fallback to URL params
      const urlParams = new URLSearchParams(location.search);
      const projectId = urlParams.get('id');
      const projectName = urlParams.get('name');
      const projectDescription = urlParams.get('description');
      const projectCreatedAt = urlParams.get('created_at');

      if (projectId && projectName) {
        const projectData: ProjectData = {
          id: projectId,
          name: projectName,
          description: projectDescription,
          created_at: projectCreatedAt || new Date().toISOString()
        };
        setProject(projectData);
        fetchProjectData(projectData);
      } else {
        toast({
          title: "Chyba",
          description: "Neplatné data projektu",
          variant: "destructive"
        });
        navigate('/projekty');
      }
    }
  }, [location, navigate, toast]);

  const fetchProjectData = async (projectData: ProjectData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      // Fetch campaigns - try project_id first, then fallback to project name
      const [campaignsById, campaignsByName] = await Promise.all([
        supabase
          .from('Campaigns')
          .select('id, name, status, created_at')
          .eq('project_id', projectData.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('Campaigns')
          .select('id, name, status, created_at')
          .eq('project', projectData.name)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const allCampaigns = [
        ...(campaignsById.data || []),
        ...(campaignsByName.data || [])
      ].filter((campaign, index, self) => 
        index === self.findIndex(c => c.id === campaign.id)
      );

      setCampaigns(allCampaigns);

      // Fetch emails - try project_id first, then fallback to project name
      const [emailsById, emailsByName] = await Promise.all([
        supabase
          .from('Emails')
          .select('id, type, content, created_at')
          .eq('project_id', projectData.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('Emails')
          .select('id, type, content, created_at')
          .eq('project', projectData.name)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const allEmails = [
        ...(emailsById.data || []),
        ...(emailsByName.data || [])
      ].filter((email, index, self) => 
        index === self.findIndex(e => e.id === email.id)
      );

      setEmails(allEmails);

      // Fetch AI Requests - only by project_id (no project name column in AIRequests)
      const { data: aiRequestsData } = await supabase
        .from('AIRequests')
        .select('id, type, status, created_at')
        .eq('project_id', projectData.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setAIRequests(aiRequestsData || []);

      // Set stats
      setStats({
        campaigns: allCampaigns.length,
        emails: allEmails.length,
        aiRequests: (aiRequestsData || []).length
      });

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

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Aktivní</Badge>;
      case 'done':
        return <Badge variant="outline">Dokončeno</Badge>;
      case 'waiting':
        return <Badge variant="secondary">Čeká</Badge>;
      default:
        return <Badge variant="secondary">Koncept</Badge>;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání projektu...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Projekt nenalezen</h2>
          <Button onClick={() => navigate('/projekty')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na projekty
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/projekty')}
          variant="ghost"
          size="sm"
          className="group h-9 px-3 bg-gradient-primary hover:opacity-90 hover:shadow-medium text-white border-0 transition-all duration-300 hover:scale-105"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Zpět
        </Button>

        {/* Project Header */}
        <Card className="rounded-2xl shadow-md border-border bg-gradient-card">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold">{project.name}</CardTitle>
                {project.description && (
                  <p className="text-muted-foreground mt-1">{project.description}</p>
                )}
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-1" />
                  Vytvořeno: {formatDate(project.created_at)}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-xl shadow-md border-border bg-gradient-card cursor-pointer hover:shadow-strong transition-all duration-300" 
                onClick={() => setActiveTab('campaigns')}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.campaigns}</div>
                  <div className="text-sm text-muted-foreground">Kampaní</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-md border-border bg-gradient-card cursor-pointer hover:shadow-strong transition-all duration-300" 
                onClick={() => setActiveTab('emails')}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.emails}</div>
                  <div className="text-sm text-muted-foreground">E-mailů</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-md border-border bg-gradient-card cursor-pointer hover:shadow-strong transition-all duration-300" 
                onClick={() => setActiveTab('ai-requests')}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.aiRequests}</div>
                  <div className="text-sm text-muted-foreground">AI požadavků</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <Card className="rounded-2xl shadow-md border-border bg-gradient-card">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="campaigns" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Kampaně ({stats.campaigns})
                </TabsTrigger>
                <TabsTrigger value="emails" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-maily ({stats.emails})
                </TabsTrigger>
                <TabsTrigger value="ai-requests" className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  AI požadavky ({stats.aiRequests})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="campaigns" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Kampaně</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/campaigns?project=${encodeURIComponent(project.name)}`)}
                    >
                      Zobrazit kampaň
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Název</TableHead>
                        <TableHead>Stav</TableHead>
                        <TableHead>Vytvořeno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow 
                          key={campaign.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell><StatusBadge status={campaign.status} /></TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(campaign.created_at)}</TableCell>
                        </TableRow>
                      ))}
                      {campaigns.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            Žádné kampaně nenalezeny
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="emails" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">E-maily</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/emails?project=${encodeURIComponent(project.name)}`)}
                    >
                      Zobrazit e-mail
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Typ</TableHead>
                        <TableHead>Náhled obsahu</TableHead>
                        <TableHead>Vytvořeno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emails.map((email) => (
                        <TableRow 
                          key={email.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/emails/${email.id}`)}
                        >
                          <TableCell>
                            <Badge variant="outline">{email.type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate text-muted-foreground">
                              {truncateText(email.content ?? '', 100)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(email.created_at)}</TableCell>
                        </TableRow>
                      ))}
                      {emails.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            Žádné e-maily nenalezeny
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="ai-requests" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">AI požadavky</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/ai-assistant?project=${encodeURIComponent(project.name)}`)}
                    >
                      Zobrazit AI požadavek
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Typ</TableHead>
                        <TableHead>Stav</TableHead>
                        <TableHead>Vytvořeno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiRequests.map((request) => (
                        <TableRow 
                          key={request.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/ai-assistant/${request.id}`)}
                        >
                          <TableCell>
                            <Badge variant="outline">{request.type}</Badge>
                          </TableCell>
                          <TableCell><StatusBadge status={request.status} /></TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(request.created_at)}</TableCell>
                        </TableRow>
                      ))}
                      {aiRequests.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            Žádné AI požadavky nenalezeny
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
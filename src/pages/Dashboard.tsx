import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { ProjectSelector } from '@/components/Dashboard/ProjectSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
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
  MousePointer
} from 'lucide-react';

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

interface DashboardStats {
  activeCampaigns: number;
  totalEmails: number;
  totalContacts: number;
  avgOpenRate: number;
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: 0,
    totalEmails: 0,
    totalContacts: 0,
    avgOpenRate: 0
  });
  const [loading, setLoading] = useState(true);
  const { selectedProjectId } = useApp();
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, [selectedProjectId]);

  const fetchDashboardData = async () => {
    try {
      // Build query for campaigns
      let campaignsQuery = supabase
        .from('Campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Filter by project if selected
      if (selectedProjectId) {
        campaignsQuery = campaignsQuery.eq('project_id', selectedProjectId);
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
        project_id: (campaign as any).project_id || null,
        created_at: campaign.created_at
      })));

      // Fetch dashboard statistics with project filtering
      let activeCampaignsQuery = supabase.from('Campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active');
      let emailsQuery = supabase.from('Emails').select('*', { count: 'exact', head: true });
      
      if (selectedProjectId) {
        activeCampaignsQuery = activeCampaignsQuery.eq('project_id', selectedProjectId);
        emailsQuery = emailsQuery.eq('project', selectedProjectId);
      }

      const [
        { count: activeCampaignsCount },
        { count: totalEmailsCount },
        { count: totalContactsCount },
        { data: emailLogsData }
      ] = await Promise.all([
        activeCampaignsQuery,
        emailsQuery,
        supabase.from('Contacts').select('*', { count: 'exact', head: true }).eq('subscribed', true),
        supabase.from('EmailLogs').select('opened_at').not('opened_at', 'is', null)
      ]);

      // Calculate average open rate
      const totalEmails = totalEmailsCount || 0;
      const openedEmails = emailLogsData?.length || 0;
      const avgOpenRate = totalEmails > 0 ? (openedEmails / totalEmails) * 100 : 0;

      setStats({
        activeCampaigns: activeCampaignsCount || 0,
        totalEmails: totalEmailsCount || 0,
        totalContacts: totalContactsCount || 0,
        avgOpenRate: Math.round(avgOpenRate * 10) / 10
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
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
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

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          change="Aktivní odběratelé"
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="E-maily odeslané"
          value={stats.totalEmails.toString()}
          change="Celkem v systému"
          changeType="positive"
          icon={Mail}
        />
        <StatsCard
          title="Průměrné otevření"
          value={`${stats.avgOpenRate}%`}
          change={stats.avgOpenRate > 20 ? "Dobrý výkon" : "Potřeba zlepšení"}
          changeType={stats.avgOpenRate > 20 ? "positive" : "negative"}
          icon={Eye}
        />
      </div>

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

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rychlé akce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/planovac-publikace">
                  <Calendar className="w-4 h-4 mr-3" />
                  Plánovač publikací
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/emails">
                  <Mail className="w-4 h-4 mr-3" />
                  E-mailové centrum
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/autoresponses">
                  <MessageSquare className="w-4 h-4 mr-3" />
                  Nastavit auto-odpověď
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/contacts">
                  <Users className="w-4 h-4 mr-3" />
                  Spravovat kontakty
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/templates">
                  <MessageSquare className="w-4 h-4 mr-3" />
                  Šablony obsahu
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/reports">
                  <BarChart3 className="w-4 h-4 mr-3" />
                  Zobrazit reporty
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
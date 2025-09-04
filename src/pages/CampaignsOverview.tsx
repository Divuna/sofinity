import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Edit3, 
  BarChart3,
  Calendar,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelectedProject } from '@/providers/ProjectProvider';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'done';
  targeting: string | null;
  email: string | null;
  post: string | null;
  video: string | null;
  project: string | null;
  created_at: string;
  user_id: string;
}

interface Project {
  id: string;
  name: string;
}

export default function CampaignsOverview() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { selectedProject } = useSelectedProject();

  useEffect(() => {
    fetchCampaigns();
    fetchProjects();
  }, [selectedProject]);

  const fetchCampaigns = async () => {
    try {
      let query = supabase
        .from('Campaigns')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      if (selectedProject?.id) {
        query = query.eq('project_id', selectedProject.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst kampaně",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // Get project filter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get('project');
    if (projectParam) {
      setProjectFilter(projectParam);
    }
  }, []);

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesProject = projectFilter === 'all' || projectFilter === campaign.project;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Aktivní</Badge>;
      case 'done':
        return <Badge variant="outline">Dokončeno</Badge>;
      default:
        return <Badge variant="secondary">Koncept</Badge>;
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

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Kampaně{selectedProject ? ` — ${selectedProject.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa marketingových kampaní a jejich obsahu
          </p>
        </div>
        <Button 
          variant="gradient" 
          className="shadow-strong"
          onClick={() => navigate('/ai-assistant?type=campaign_generator')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová kampaň
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat kampaně..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle stavu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="draft">Koncept</SelectItem>
                <SelectItem value="active">Aktivní</SelectItem>
                <SelectItem value="done">Dokončeno</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtr podle projektu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny projekty</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.name} value={project.name}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Seznam kampaní ({filteredCampaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Načítání kampaní...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Vytvořeno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow 
                    key={campaign.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{campaign.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {campaign.project || 'Není přiřazen'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(campaign.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleDateString('cs-CZ', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">Žádné kampaně nenalezeny</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </MainLayout>
  );
}
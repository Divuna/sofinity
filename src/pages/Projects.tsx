import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Calendar, Mail, Target, Bot, Wifi, WifiOff, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOpravoStatus, isOpravoProject, saveOpravoStatusToStorage, loadOpravoStatusFromStorage, type OpravoStatus } from '@/lib/integrations';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  campaignCount: number;
  emailCount: number;
  aiRequestCount: number;
  isOpravoProject?: boolean;
}

// Helper function to deduplicate arrays by id
const dedupeById = <T extends { id: string }>(arr: T[]): T[] => {
  return arr.filter((item, index, self) => 
    index === self.findIndex(i => i.id === item.id)
  );
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [opravoStatus, setOpravoStatus] = useState<OpravoStatus | null>(null);
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
    
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, []);

  useEffect(() => {
    // Start monitoring for Opravo projects
    const opravoProjects = projects.filter(p => isOpravoProject(p.name));
    if (opravoProjects.length > 0) {
      console.log('📋 [Projects] Starting Opravo monitoring for projects list');
      
      // Load from localStorage first to avoid flicker
      const cachedStatus = loadOpravoStatusFromStorage();
      if (cachedStatus) {
        console.log('💾 [Projects] Using cached status:', cachedStatus);
        setOpravoStatus(cachedStatus);
      }
      
      // Start polling
      const checkStatus = async () => {
        try {
          const status = await getOpravoStatus();
          console.log('🔄 [Projects] Received status update:', status);
          setOpravoStatus(status);
          saveOpravoStatusToStorage(status);
        } catch (error) {
          console.error('Error checking Opravo status:', error);
        }
      };

      // Initial check
      checkStatus();

      // Poll every 60 seconds
      const interval = setInterval(checkStatus, 60000);
      setStatusPolling(interval);
    } else {
      if (statusPolling) {
        clearInterval(statusPolling);
        setStatusPolling(null);
      }
      setOpravoStatus(null);
    }
  }, [projects]);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: projectsData, error } = await supabase
        .from('Projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each project, get counts of related data with proper merge and deduplication
      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          // Fetch Campaigns with fallback and deduplication
          const [campaignsById, campaignsByName] = await Promise.all([
            supabase
              .from('Campaigns')
              .select('id')
              .eq('project_id', project.id)
              .eq('user_id', user.id),
            supabase
              .from('Campaigns')
              .select('id')
              .eq('project', project.name)
              .eq('user_id', user.id)
          ]);

          const allCampaigns = dedupeById([
            ...(campaignsById.data || []),
            ...(campaignsByName.data || [])
          ]);

          // Fetch Emails with fallback and deduplication
          const [emailsById, emailsByName] = await Promise.all([
            supabase
              .from('Emails')
              .select('id')
              .eq('project_id', project.id)
              .eq('user_id', user.id),
            supabase
              .from('Emails')
              .select('id')
              .eq('project', project.name)
              .eq('user_id', user.id)
          ]);

          const allEmails = dedupeById([
            ...(emailsById.data || []),
            ...(emailsByName.data || [])
          ]);

          // Fetch AI Requests (only project_id available, no project name column)
          const { data: aiRequestsData } = await supabase
            .from('AIRequests')
            .select('id')
            .eq('project_id', project.id)
            .eq('user_id', user.id);

          return {
            ...project,
            campaignCount: allCampaigns.length,
            emailCount: allEmails.length,
            aiRequestCount: (aiRequestsData || []).length,
            isOpravoProject: isOpravoProject(project.name)
          };
        })
      );

      setProjects(projectsWithCounts);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst projekty",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCampaigns = (projectName: string) => {
    navigate(`/campaigns?project=${encodeURIComponent(projectName)}`);
  };

  const handleViewEmails = (projectName: string) => {
    navigate(`/emails?project=${encodeURIComponent(projectName)}`);
  };

  const handleViewAIRequests = (projectName: string) => {
    navigate(`/ai-assistant?project=${encodeURIComponent(projectName)}`);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání projektů...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projekty</h1>
          <p className="text-muted-foreground mt-1">
            Přehled všech projektů a jejich statistik
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="rounded-2xl shadow-md hover:shadow-strong transition-all duration-300 border-border bg-gradient-card">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
                      {project.isOpravoProject && opravoStatus && (
                        <Badge 
                          variant={opravoStatus.isConnected ? 'default' : 'destructive'}
                          className="text-xs flex items-center gap-1"
                        >
                          {opravoStatus.isConnected ? (
                            <><Wifi className="w-3 h-3" /> Připojeno</>
                          ) : (
                            <><WifiOff className="w-3 h-3" /> Odpojeno</>
                          )}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(project.created_at).toLocaleDateString('cs-CZ')}
                    </div>
                  </div>
                </div>
                
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-surface-variant hover:bg-surface-variant/80 transition-colors cursor-pointer" onClick={() => handleViewCampaigns(project.name)}>
                    <div className="flex items-center justify-center mb-1">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div className="font-semibold text-foreground">{project.campaignCount}</div>
                    <div className="text-xs text-muted-foreground">Kampaní</div>
                  </div>
                  
                  <div className="text-center p-3 rounded-xl bg-surface-variant hover:bg-surface-variant/80 transition-colors cursor-pointer" onClick={() => handleViewEmails(project.name)}>
                    <div className="flex items-center justify-center mb-1">
                      <Mail className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="font-semibold text-foreground">{project.emailCount}</div>
                    <div className="text-xs text-muted-foreground">E-mailů</div>
                  </div>
                  
                  <div className="text-center p-3 rounded-xl bg-surface-variant hover:bg-surface-variant/80 transition-colors cursor-pointer" onClick={() => handleViewAIRequests(project.name)}>
                    <div className="flex items-center justify-center mb-1">
                      <Bot className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <div className="font-semibold text-foreground">{project.aiRequestCount}</div>
                    <div className="text-xs text-muted-foreground">AI požadavků</div>
                  </div>
                </div>

                {/* Debug Info for Opravo projects - TEMPORARY */}
                {project.isOpravoProject && opravoStatus && (
                  <div className="p-2 bg-muted/50 rounded-lg border text-xs space-y-1">
                    <div className="flex items-center gap-1 font-medium text-muted-foreground">
                      <Bug className="w-3 h-3" />
                      Debug Info (dočasné)
                    </div>
                    <div>Poslední kontrola: {new Date(opravoStatus.lastChecked).toLocaleString('cs-CZ')}</div>
                    {opravoStatus.error && (
                      <div className="text-destructive">Chyba: {opravoStatus.error}</div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => {
                      const params = new URLSearchParams({
                        id: project.id,
                        name: project.name,
                        description: project.description || '',
                        created_at: project.created_at
                      });
                      navigate(`/projekty/detail?${params.toString()}`);
                    }}
                    className="w-full text-xs"
                  >
                    Detail projektu
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCampaigns(project.name)}
                      className="text-xs"
                    >
                      Zobrazit kampaně
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEmails(project.name)}
                      className="text-xs"
                    >
                      Zobrazit e‑maily
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAIRequests(project.name)}
                      className="text-xs"
                    >
                      AI požadavky
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Zatím nemáte žádné projekty</h3>
          <p className="text-muted-foreground">Kontaktujte administrátora pro vytvoření projektu</p>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { Building2, Eye, Calendar, Mail, Target, Bot } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  campaignCount: number;
  emailCount: number;
  aiRequestCount: number;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { setSelectedProjectId } = useApp();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('Projects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  const handleViewProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    window.location.href = '/dashboard';
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
            Přehled všech aktivních projektů a jejich výsledků
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="rounded-2xl shadow-md hover:shadow-strong transition-all duration-300 border-border bg-gradient-card">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={project.is_active ? "default" : "secondary"} className="text-xs">
                          {project.is_active ? "Aktivní" : "Neaktivní"}
                        </Badge>
                      </div>
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
                  <div className="text-center p-3 rounded-xl bg-surface-variant">
                    <div className="flex items-center justify-center mb-1">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div className="font-semibold text-foreground">{project.campaignCount}</div>
                    <div className="text-xs text-muted-foreground">Kampaní</div>
                  </div>
                  
                  <div className="text-center p-3 rounded-xl bg-surface-variant">
                    <div className="flex items-center justify-center mb-1">
                      <Mail className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="font-semibold text-foreground">{project.emailCount}</div>
                    <div className="text-xs text-muted-foreground">E-mailů</div>
                  </div>
                  
                  <div className="text-center p-3 rounded-xl bg-surface-variant">
                    <div className="flex items-center justify-center mb-1">
                      <Bot className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <div className="font-semibold text-foreground">{project.aiRequestCount}</div>
                    <div className="text-xs text-muted-foreground">AI výstupů</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(project.created_at).toLocaleDateString('cs-CZ')}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProject(project.id)}
                    className="rounded-lg"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Zobrazit detail
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Zatím nemáte žádné projekty</h3>
          <p className="text-muted-foreground">Začněte vytvořením svého prvního projektu</p>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { useToast } from '@/hooks/use-toast';
import { Building2, Wifi, WifiOff } from 'lucide-react';
import { checkOpravoIntegration, startOpravoStatusMonitoring, stopOpravoStatusMonitoring } from '@/lib/integrations';

interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  campaigns_count: number;
  isOpravoProject?: boolean;
}

export function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [opravoStatus, setOpravoStatus] = useState<{isConnected: boolean; lastChecked: Date; error?: string} | null>(null);
  const { selectedProject, setSelectedProject } = useSelectedProject();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
    
    return () => {
      stopOpravoStatusMonitoring();
    };
  }, []);

  useEffect(() => {
    // Start monitoring when Opravo project is selected
    if (selectedProject?.name === 'Opravo') {
      startOpravoStatusMonitoring((status) => {
        setOpravoStatus(status);
      });
    } else {
      stopOpravoStatusMonitoring();
      setOpravoStatus(null);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data and get campaign counts for each project
      const projectList = await Promise.all(
        (data || []).map(async (project) => {
          const { count: campaignsCount } = await supabase
            .from('Campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          return {
            id: project.id,
            name: project.name,
            description: project.description,
            is_active: project.is_active,
            campaigns_count: campaignsCount || 0,
            isOpravoProject: project.name === 'Opravo'
          };
        })
      );

      setProjects(projectList);
      
      // Auto-select first project if none selected
      if (!selectedProject && projectList.length > 0 && projectList[0].id && projectList[0].id.trim() !== '') {
        setSelectedProject({
          id: projectList[0].id,
          name: projectList[0].name
        });
      }
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


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Projekty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Projekty
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length > 0 ? (
          <>
            <div>
              <Select 
                value={selectedProject?.id || 'none'} 
                onValueChange={(value) => {
                  if (value === 'none') {
                    setSelectedProject(null);
                  } else {
                    const project = projects.find(p => p.id === value);
                    if (project) {
                      setSelectedProject({
                        id: project.id,
                        name: project.name
                      });
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Všechny projekty</SelectItem>
                  {projects.filter(project => project.id && project.id.trim() !== '').map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span>{project.name}</span>
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
                        <Badge variant="secondary" className="ml-2">
                          {project.campaigns_count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProject && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                {(() => {
                  const selected = projects.find(p => p.id === selectedProject.id);
                  return selected ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-foreground">{selected.name}</div>
                        {selected.isOpravoProject && opravoStatus && (
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
                      {selected.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {selected.description}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">
                          {selected.campaigns_count} kampaní
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Aktivní
                        </Badge>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Zatím nemáte žádné projekty</p>
            <p className="text-xs text-muted-foreground mt-1">Kontaktujte administrátora pro vytvoření projektu</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
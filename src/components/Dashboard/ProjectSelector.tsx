import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { useToast } from '@/hooks/use-toast';
import { Building2, Wifi, WifiOff, Bug } from 'lucide-react';
import { getSofinityStatus, isSofinityProject, saveSofinityStatusToStorage, loadSofinityStatusFromStorage, type SofinityStatus } from '@/lib/integrations';

interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  campaigns_count: number;
  isSofinityProject?: boolean;
  sofinityStatus?: SofinityStatus;
}

export function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectStatuses, setProjectStatuses] = useState<Record<string, SofinityStatus>>({});
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null);
  const { selectedProject, setSelectedProject } = useSelectedProject();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
    
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, []);

  useEffect(() => {
    // Start monitoring all projects
    if (projects.length > 0) {
      console.log('🎯 [ProjectSelector] Starting Sofinity monitoring for all projects');
      
      // Check all projects
      const checkAllStatuses = async () => {
        const statuses: Record<string, SofinityStatus> = {};
        
        for (const project of projects) {
          try {
            // Load from localStorage first
            const cachedStatus = loadSofinityStatusFromStorage(project.id);
            if (cachedStatus) {
              statuses[project.id] = cachedStatus;
            }
            
            // Then fetch fresh status
            const status = await getSofinityStatus(project.id);
            console.log(`🔄 [ProjectSelector] Status for ${project.name}:`, status);
            statuses[project.id] = status;
            saveSofinityStatusToStorage(status, project.id);
          } catch (error) {
            console.error(`Error checking Sofinity status for ${project.name}:`, error);
          }
        }
        
        setProjectStatuses(statuses);
      };

      // Initial check
      checkAllStatuses();

      // Poll every 60 seconds
      const interval = setInterval(checkAllStatuses, 60000);
      setStatusPolling(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [projects]);

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
            isSofinityProject: isSofinityProject(project.name)
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
                  {projects.filter(project => project.id && project.id.trim() !== '').map((project) => {
                    const status = projectStatuses[project.id];
                    return (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span>{project.name}</span>
                            {status && (
                              <Badge 
                                variant={status.isConnected ? 'default' : status.error ? 'destructive' : 'secondary'}
                                className="text-xs flex items-center gap-1"
                              >
                                {status.isConnected ? (
                                  <><Wifi className="w-3 h-3" /> Připojeno</>
                                ) : status.error ? (
                                  <><WifiOff className="w-3 h-3" /> Chyba</>
                                ) : (
                                  <><WifiOff className="w-3 h-3" /> Nepřipojeno</>
                                )}
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {project.campaigns_count}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedProject && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                {(() => {
                  const selected = projects.find(p => p.id === selectedProject.id);
                  const status = selected ? projectStatuses[selected.id] : null;
                  return selected ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-foreground">{selected.name}</div>
                        {status && (
                          <Badge 
                            variant={status.isConnected ? 'default' : status.error ? 'destructive' : 'secondary'}
                            className="text-xs flex items-center gap-1"
                          >
                            {status.isConnected ? (
                              <><Wifi className="w-3 h-3" /> Připojeno</>
                            ) : status.error ? (
                              <><WifiOff className="w-3 h-3" /> Chyba</>
                            ) : (
                              <><WifiOff className="w-3 h-3" /> Nepřipojeno</>
                            )}
                          </Badge>
                        )}
                      </div>
                       {selected.description && (
                         <div className="text-sm text-muted-foreground mt-1">
                           {selected.description}
                         </div>
                       )}
                       
                       {/* Debug Info */}
                       {status && (
                         <div className="p-2 bg-muted/50 rounded-lg border text-xs space-y-1 mt-2">
                           <div className="flex items-center gap-1 font-medium text-muted-foreground">
                             <Bug className="w-3 h-3" />
                             Stav propojení
                           </div>
                           <div>
                             Poslední kontrola: {new Date(status.lastChecked).toLocaleString('cs-CZ')}
                           </div>
                           {status.error && (
                             <div className="text-destructive">Chyba: {status.error}</div>
                           )}
                           {status.latency && (
                             <div className="text-muted-foreground">Latence: {status.latency}ms</div>
                           )}
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
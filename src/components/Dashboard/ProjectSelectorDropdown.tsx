import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  campaigns_count: number;
}

export function ProjectSelectorDropdown() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedProjectId, setSelectedProjectId } = useApp();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

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
            campaigns_count: campaignsCount || 0
          };
        })
      );

      setProjects(projectList);
      
      // Auto-select first project if none selected
      if (!selectedProjectId && projectList.length > 0) {
        setSelectedProjectId(projectList[0].id);
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

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 min-w-48">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <div className="animate-pulse bg-muted rounded h-8 flex-1"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
        <SelectTrigger className="min-w-48 bg-surface border-border">
          <SelectValue 
            placeholder="Vyberte projekt"
          />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="" className="text-muted-foreground">
            Všechny projekty
          </SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center justify-between w-full">
                <span className="text-foreground">{project.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {project.campaigns_count}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
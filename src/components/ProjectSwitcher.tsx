import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  is_active: boolean;
}

export const ProjectSwitcher: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedProject, setSelectedProject, loadingSelectedProject } = useSelectedProject();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setSelectedProject({
        id: project.id,
        name: project.name
      });
    }
  };

  if (loading || loadingSelectedProject) {
    return (
      <div className="flex items-center space-x-2">
        <FolderOpen className="w-4 h-4 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Projekt</p>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <FolderOpen className="w-4 h-4 text-muted-foreground" />
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Projekt</label>
        <Select
          value={selectedProject?.id || ""}
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Vyberte projekt" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
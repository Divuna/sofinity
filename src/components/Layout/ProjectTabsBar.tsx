import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedProject } from '@/providers/ProjectProvider';

interface ProjectTab {
  id: string;
  name: string;
}

export function ProjectTabsBar() {
  const { selectedProject, setSelectedProject } = useSelectedProject();
  const [projects, setProjects] = useState<ProjectTab[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await (supabase
        .from('Projects')
        .select('id, name')
        .eq('active', true)
        .order('name') as any);
      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      const fetched = data ?? [];
      setProjects(fetched);

      if (!selectedProject && fetched.length > 0) {
        setSelectedProject({ id: fetched[0].id, name: fetched[0].name });
      }
    };

    fetchProjects();
  }, [selectedProject, setSelectedProject]);

  if (projects.length === 0) return null;

  return (
    <div className="sticky top-0 z-30 w-full bg-background border-b border-border">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {projects.map((project) => {
          const isActive = selectedProject?.id === project.id;
          return (
            <button
              key={project.id}
              onClick={() => setSelectedProject({ id: project.id, name: project.name })}
              className={`shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
              }`}
            >
              {project.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

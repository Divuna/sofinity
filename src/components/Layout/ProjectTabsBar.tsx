import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedProject } from '@/providers/ProjectProvider';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectTab {
  id: string;
  name: string;
}

export function ProjectTabsBar() {
  const { selectedProject, setSelectedProject, loadingSelectedProject } = useSelectedProject();
  const [projects, setProjects] = useState<ProjectTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('Projects')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) {
          setProjects(data);
          if (!selectedProject && data.length > 0) {
            setSelectedProject({ id: data[0].id, name: data[0].name });
          }
        }
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || loadingSelectedProject) {
    return (
      <div className="sticky top-0 z-30 w-full bg-background border-b border-border">
        <div className="flex items-center gap-2 px-4 py-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

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
